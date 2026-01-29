# CiceronAI Backend - Database Setup

## Overview

This document describes the PostgreSQL database schema and setup process for the CiceronAI backend.

## Prerequisites

- PostgreSQL 12 or higher
- Node.js 18+ with npm

## Database Installation

### Option 1: Using Docker (Recommended for Development)

```bash
# Create a PostgreSQL container
docker run -d \
  --name ciceron-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine
```

### Option 2: Local PostgreSQL Installation

#### On Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the `postgres` user

#### On macOS

```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create database
createdb ciceron_ai
```

#### On Linux (Ubuntu/Debian)

```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Create database
sudo -u postgres createdb ciceron_ai
```

## Environment Configuration

Update your `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ciceron_ai
DB_USER=postgres
DB_PASSWORD=your_password_here
```

## Database Schema

The CiceronAI backend uses three main tables:

### 1. Debates Table

Stores debate session information.

```sql
CREATE TABLE debates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_a_name VARCHAR(255) NOT NULL,
  team_b_name VARCHAR(255) NOT NULL,
  debate_topic TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'active' 
    CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `team_a_name`: Name of team A
- `team_b_name`: Name of team B
- `debate_topic`: The debate topic/question
- `status`: Current status (active, completed, or archived)
- `created_at`: When the debate was created
- `updated_at`: Last update timestamp

### 2. Recordings Table

Stores audio recording metadata.

```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  team CHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
  round_type VARCHAR(255) NOT NULL,
  round_order INT NOT NULL,
  duration INT NOT NULL,
  file_path VARCHAR(500),
  transcription TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `debate_id`: Foreign key to debates table
- `team`: Which team (A or B)
- `round_type`: Type of round (Introducción, Refutación, etc.)
- `round_order`: Order within the debate (1-8)
- `duration`: Recording duration in seconds
- `file_path`: Path to stored audio file (future use)
- `transcription`: Speech-to-text transcription (populated by AI)
- `created_at`: When recording was created

### 3. Evaluations Table

Stores AI-generated evaluations and scores.

```sql
CREATE TABLE evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
  recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  team CHAR(1) NOT NULL CHECK (team IN ('A', 'B')),
  round_type VARCHAR(255) NOT NULL,
  score INT NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback TEXT,
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**
- `id`: Unique identifier (UUID)
- `debate_id`: Foreign key to debates table
- `recording_id`: Foreign key to recordings table
- `team`: Which team (A or B)
- `round_type`: Type of round evaluated
- `score`: Numerical score (0-100)
- `feedback`: AI-generated feedback text
- `strengths`: Array of identified strengths
- `weaknesses`: Array of identified weaknesses
- `created_at`: When evaluation was created

## Indexes

The database includes the following indexes for performance:

```sql
CREATE INDEX idx_recordings_debate_id ON recordings(debate_id);
CREATE INDEX idx_evaluations_debate_id ON evaluations(debate_id);
CREATE INDEX idx_evaluations_recording_id ON evaluations(recording_id);
```

## Data Relationships

```
debates (1)
  ├── (1:N) recordings
  │           └── (1:N) evaluations
  └── (1:N) evaluations
```

**Referential Integrity:**
- Deleting a debate cascades deletion to all its recordings and evaluations
- Deleting a recording cascades deletion to its evaluations
- All foreign key constraints are enforced

## Migration & Seeding

### Automatic Initialization

When the backend server starts, it automatically:
1. Connects to PostgreSQL
2. Creates tables if they don't exist
3. Creates indexes

```bash
npm run dev
# Logs: "Database initialized successfully"
```

### Manual Database Operations

The backend provides utility functions for database management:

```typescript
// In your code or CLI:
import { runMigrations, seedDatabase, clearDatabase, resetDatabase } from './src/services/migrations';

// Run migrations (create schema)
await runMigrations();

// Seed with sample data
await seedDatabase();

// Clear all data (keep schema)
await clearDatabase();

// Reset completely (drop and recreate schema)
await resetDatabase();
```

## Sample Data

When seeding the database with `seedDatabase()`, you get:

- 1 sample debate between "Sample Team A" and "Sample Team B"
- 1 sample recording (Team A's introduction, 185 seconds)
- 1 sample evaluation for that recording (score: 85/100)

This helps test the API without needing to record actual audio.

## Backup and Restore

### Backup Database

```bash
# Backup to file
pg_dump -U postgres -h localhost ciceron_ai > backup.sql

# Or with Docker
docker exec ciceron-postgres pg_dump -U postgres ciceron_ai > backup.sql
```

### Restore Database

```bash
# Restore from file
psql -U postgres -h localhost ciceron_ai < backup.sql

# Or with Docker
docker exec -i ciceron-postgres psql -U postgres ciceron_ai < backup.sql
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
1. Check PostgreSQL is running: `pg_isready -h localhost -p 5432`
2. Verify .env variables are correct
3. Check database user exists: `psql -U postgres -l`

### Authentication Failed

```
Error: password authentication failed for user "postgres"
```

**Solutions:**
1. Verify password in .env matches PostgreSQL setup
2. Reset PostgreSQL password:
   ```bash
   sudo -u postgres psql
   \password postgres
   ```

### Database Doesn't Exist

```
Error: database "ciceron_ai" does not exist
```

**Solutions:**
1. Create database:
   ```bash
   createdb ciceron_ai
   ```
2. Or let the backend auto-create it on first startup

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::5432
```

**Solutions:**
1. Check what's using port 5432:
   ```bash
   lsof -i :5432  # On macOS/Linux
   netstat -ano | findstr :5432  # On Windows
   ```
2. Kill the process or use different port
3. Change DB_PORT in .env

## Performance Considerations

### Query Optimization

- Indexes are created on foreign keys for join performance
- Consider adding indexes on frequently queried columns
- Use `EXPLAIN ANALYZE` to profile slow queries

### Connection Pool

The backend uses a connection pool with sensible defaults. For heavy load, adjust in `database.ts`:

```typescript
const pool = new Pool({
  max: 20,              // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Data Retention

Consider archiving old debates:

```typescript
// Archive completed debates older than 90 days
UPDATE debates 
SET status = 'archived' 
WHERE status = 'completed' 
AND created_at < NOW() - INTERVAL '90 days';
```

## Production Deployment

For production:

1. **Use strong passwords** - Generate secure passwords for database users
2. **Enable SSL connections** - Set `sslmode=require` in connection string
3. **Restrict network access** - Only allow backend server to connect
4. **Regular backups** - Set up automated daily backups
5. **Monitor performance** - Track slow queries and connection usage
6. **Use connection pooling** - Implement PgBouncer for high traffic
7. **Separate read replicas** - For read-heavy workloads

Example production connection string:

```
postgresql://ciceron_user:strongpassword@db.example.com:5432/ciceron_ai?sslmode=require
```

## Next Steps

1. Verify database connection: `npm run dev`
2. Test API endpoints with sample data
3. Implement file storage for audio files
4. Add authentication layer
5. Set up monitoring and alerting

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js pg Driver](https://node-postgres.com/)
- [PostgreSQL Best Practices](https://wiki.postgresql.org/wiki/Performance_Optimization)
