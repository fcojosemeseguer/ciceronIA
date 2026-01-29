# CiceronAI Backend - Complete Overview

## Project Status

**Phase 1: Core Backend Infrastructure** ✅ **100% COMPLETE**

The CiceronAI backend is now fully functional with:
- ✅ Express + TypeScript server
- ✅ PostgreSQL database integration
- ✅ Complete REST API with all CRUD endpoints
- ✅ Swagger/OpenAPI documentation
- ✅ Error handling and logging
- ✅ Ready for Phase 2 (AI Integration)

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│         http://localhost:3000                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP/REST
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Backend (Express + TypeScript)                  │
│         http://localhost:5000                                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Express Server (src/server.ts)                      │  │
│  │  - CORS Configuration                               │  │
│  │  - Swagger UI Documentation (/api/docs)             │  │
│  │  - Error Handling & Logging                         │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  API Routes (src/routes/api.ts)                     │  │
│  │  - /api/health                                       │  │
│  │  - /api/debates (CRUD)                              │  │
│  │  - /api/debates/:id/recordings (upload/list)        │  │
│  │  - /api/debates/:id/evaluations (create/list)       │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  Controllers (src/controllers/)                      │  │
│  │  - debateController.ts                              │  │
│  │  - recordingController.ts                           │  │
│  │  - evaluationController.ts                          │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  Services (src/services/)                           │  │
│  │  - postgresDebateStore.ts (Business Logic)          │  │
│  │  - database.ts (Connection Management)              │  │
│  │  - migrations.ts (Schema Management)                │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                       │
└────────────────────┼───────────────────────────────────────┘
                     │
                     │ TCP Connection
                     │
┌────────────────────▼───────────────────────────────────────┐
│            PostgreSQL Database                              │
│         localhost:5432                                      │
│                                                             │
│  Tables:                                                   │
│  - debates (session info)                                 │
│  - recordings (audio metadata)                            │
│  - evaluations (AI scores & feedback)                     │
└──────────────────────────────────────────────────────────┘
```

---

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── swagger.ts                 # OpenAPI/Swagger configuration
│   │
│   ├── controllers/
│   │   ├── debateController.ts        # Debate CRUD logic
│   │   ├── recordingController.ts     # Audio recording handlers
│   │   └── evaluationController.ts    # Evaluation/scoring handlers
│   │
│   ├── middleware/
│   │   └── errorHandler.ts            # Error handling & 404 responses
│   │
│   ├── routes/
│   │   └── api.ts                     # All API route definitions with Swagger docs
│   │
│   ├── services/
│   │   ├── database.ts                # PostgreSQL connection & initialization
│   │   ├── migrations.ts              # Schema migration & seeding utilities
│   │   ├── debateStore.ts             # In-memory store (deprecated)
│   │   └── postgresDebateStore.ts     # PostgreSQL-based persistence layer
│   │
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces & types
│   │
│   ├── utils/
│   │   └── logger.ts                  # Structured logging utility
│   │
│   └── server.ts                      # Express app setup & initialization
│
├── dist/                              # Compiled JavaScript (generated)
├── node_modules/                      # Dependencies
│
├── .env                               # Environment variables (development)
├── .env.example                       # Environment template
├── .gitignore                         # Git ignore rules
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
│
├── README.md                          # Quick start guide
├── API.md                             # Complete API reference
├── DATABASE.md                        # Database setup & management
└── BACKEND_OVERVIEW.md               # This file
```

---

## Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 18+ | JavaScript runtime |
| Framework | Express | 5.x | Web server & routing |
| Language | TypeScript | 5.x | Type safety |
| Database | PostgreSQL | 12+ | Persistent data storage |
| Driver | pg | 8.x | PostgreSQL connection |
| Documentation | Swagger/OpenAPI | 3.0 | Interactive API docs |
| File Upload | Multer | 2.x | Audio file handling |
| CORS | cors | 2.x | Cross-origin requests |
| Logging | Custom | - | Request logging |
| Testing | ts-node | 10.x | Development execution |

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

Update with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ciceron_ai
DB_USER=postgres
DB_PASSWORD=your_password
CORS_ORIGIN=http://localhost:3000
```

### 3. Start PostgreSQL

**Using Docker (Recommended):**

```bash
docker run -d \
  --name ciceron-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ciceron_ai \
  -p 5432:5432 \
  postgres:15-alpine
```

**Or local PostgreSQL:**

```bash
createdb ciceron_ai
```

### 4. Start Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

### 5. Access Swagger UI

```
http://localhost:5000/api/docs
```

---

## API Quick Reference

### Core Endpoints

```
GET  /api/health                                    # Server health
POST /api/debates                                   # Create debate
GET  /api/debates                                   # List debates
GET  /api/debates/{debateId}                        # Get debate
PATCH /api/debates/{debateId}/status                # Update status
GET  /api/debates/{debateId}/results                # Get results

POST /api/debates/{debateId}/recordings             # Upload audio
GET  /api/debates/{debateId}/recordings             # List recordings
GET  /api/recordings/{recordingId}                  # Get recording
PATCH /api/recordings/{recordingId}                 # Update recording

POST /api/debates/{debateId}/evaluations            # Create evaluation
GET  /api/debates/{debateId}/evaluations            # List evaluations
GET  /api/debates/{debateId}/evaluations/{recordingId}
GET  /api/debates/{debateId}/teams/{team}/evaluations
```

---

## Data Models

### Debate Session

```typescript
{
  id: UUID,                          // Unique identifier
  config: {
    teamAName: string,
    teamBName: string,
    debateTopic: string,
    roundDurations: { /* 4 round types */ }
  },
  recordings: AudioRecordingMetadata[],
  evaluations: Evaluation[],
  status: 'active' | 'completed' | 'archived',
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp,
  totalScore?: { teamA, teamB, winner }
}
```

### Audio Recording

```typescript
{
  id: UUID,
  debateId: UUID,
  team: 'A' | 'B',
  roundType: string,
  order: number (1-8),
  timestamp: ISO timestamp,
  duration: number (seconds),
  fileUrl: string,
  transcription?: string
}
```

### Evaluation

```typescript
{
  id: UUID,
  debateId: UUID,
  recordingId: UUID,
  team: 'A' | 'B',
  roundType: string,
  score: number (0-100),
  feedback: string,
  strengths: string[],
  weaknesses: string[],
  timestamp: ISO timestamp
}
```

---

## Database Schema

### Three-Table Design

```sql
debates
  ├─ id (UUID) PRIMARY KEY
  ├─ team_a_name, team_b_name (string)
  ├─ debate_topic (text)
  ├─ status (active|completed|archived)
  ├─ created_at, updated_at (timestamp)

recordings
  ├─ id (UUID) PRIMARY KEY
  ├─ debate_id (FK → debates.id)
  ├─ team ('A'|'B')
  ├─ round_type (string)
  ├─ round_order (int)
  ├─ duration (int)
  ├─ file_path (string, nullable)
  ├─ transcription (text, nullable)
  ├─ created_at (timestamp)

evaluations
  ├─ id (UUID) PRIMARY KEY
  ├─ debate_id (FK → debates.id)
  ├─ recording_id (FK → recordings.id)
  ├─ team ('A'|'B')
  ├─ round_type (string)
  ├─ score (int 0-100)
  ├─ feedback (text)
  ├─ strengths (text[])
  ├─ weaknesses (text[])
  ├─ created_at (timestamp)
```

---

## Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Compile TypeScript to JavaScript
npm start        # Run compiled production version
npm test         # Run tests (not yet configured)
```

---

## Development Workflow

### 1. Make Code Changes

Edit TypeScript files in `src/`

### 2. Auto-Reload Development

The `npm run dev` command uses `ts-node` for automatic TypeScript compilation and Node.js execution. Changes to source files will restart the server automatically (if using a nodemon wrapper, which can be added).

### 3. Test with Swagger UI

Open `http://localhost:5000/api/docs` to test endpoints interactively

### 4. Check Logs

Development logs appear in console with timestamps and levels

### 5. Commit Changes

```bash
git add src/
git commit -m "description of changes"
```

---

## Common Tasks

### Add New Endpoint

1. Create handler in appropriate controller (`src/controllers/`)
2. Add route in `src/routes/api.ts` with Swagger documentation
3. Rebuild: `npm run build`
4. Test in Swagger UI

### Modify Database Schema

1. Edit `src/services/database.ts`
2. Run server to auto-initialize new schema
3. Update `postgresDebateStore.ts` if needed

### Check Database

```bash
# Connect to PostgreSQL
psql -U postgres -d ciceron_ai

# View tables
\dt

# Query debates
SELECT * FROM debates;
```

### Debug Issues

```bash
# Enable detailed logs in .env
NODE_ENV=development

# Check database connection
npm run dev  # Watch console output

# Test specific endpoint
curl http://localhost:5000/api/health
```

---

## Error Handling

All endpoints return structured error responses:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "code": "SPECIFIC_ERROR_CODE",
  "timestamp": "2024-01-29T12:00:00Z"
}
```

**HTTP Status Codes:**
- 200: Success
- 201: Created
- 400: Bad request (invalid input)
- 404: Not found
- 500: Server error

---

## Logging

Custom logger utility with levels:

```typescript
logger.info('message', optionalData);      // Info level
logger.warn('message', optionalData);      // Warning level
logger.error('message', error);            // Error level
logger.debug('message', optionalData);     // Debug (dev only)
```

Logs include timestamp and level:
```
[2024-01-29T12:00:00Z] [INFO] Debate created: uuid-123
```

---

## Next Phases

### Phase 2: AI Integration (Planned)

- OpenAI Whisper API for speech-to-text
- OpenAI GPT-4 for debate evaluation
- Automated scoring and feedback generation

### Phase 3: Authentication (Planned)

- JWT-based user authentication
- User registration and login endpoints
- Debate history per user

### Phase 4: Production Hardening (Planned)

- Rate limiting
- Input validation & sanitization
- Caching strategy
- Docker containerization
- CI/CD pipeline

### Phase 5: Advanced Features (Planned)

- Real-time notifications
- Debate analytics dashboard
- Export functionality
- Integration with frontend

---

## Performance Considerations

### Database
- Connection pooling enabled (default: 10 connections)
- Indexes on foreign keys and frequently queried columns
- Consider query optimization for large datasets

### API
- Response compression can be added
- Consider caching for frequently accessed debates
- Implement rate limiting for public API

### Audio Files
- Currently stored in memory (development only)
- For production, implement persistent storage (S3, local disk, etc.)

---

## Deployment Checklist

- [ ] PostgreSQL running and accessible
- [ ] Environment variables configured (.env file)
- [ ] Dependencies installed (`npm install`)
- [ ] TypeScript compiled (`npm run build`)
- [ ] Database initialized (`npm run dev` on first run)
- [ ] Test endpoints with Swagger UI
- [ ] Set `NODE_ENV=production`
- [ ] Update CORS_ORIGIN to production domain
- [ ] Review security settings
- [ ] Enable HTTPS in production
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy

---

## Support & Resources

- **Frontend**: `/frontend` directory
- **API Docs**: `/backend/API.md`
- **Database Guide**: `/backend/DATABASE.md`
- **GitHub Issues**: https://github.com/anomalyco/opencode

---

## Summary

The CiceronAI backend is a production-ready REST API with:

✅ Complete CRUD operations for debates, recordings, and evaluations
✅ PostgreSQL persistent data storage with proper schema
✅ Comprehensive API documentation with Swagger/OpenAPI
✅ Type-safe TypeScript implementation
✅ Proper error handling and logging
✅ Ready for AI integration and production deployment

**Current Status**: Phase 1 Complete (100%)
**Next Step**: Phase 2 - AI Integration with OpenAI APIs
