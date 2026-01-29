# CiceronAI Backend

REST API backend for the CiceronAI debate competition management system.

## Overview

This is the Node.js + Express backend for CiceronAI. It provides REST API endpoints for:

- **Debate Management**: Create, retrieve, and manage debate sessions
- **Audio Recording**: Upload and store audio recordings from debates
- **AI Evaluation**: Process recordings through AI for scoring and feedback
- **Results Management**: Retrieve debate results and team evaluations

## Architecture

### Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express 5.x
- **Language**: TypeScript 5.x
- **File Upload**: Multer
- **CORS**: Enabled for frontend integration
- **Logging**: Custom logger utility

### Directory Structure

```
src/
├── controllers/          # Request handlers
│   ├── debateController.ts      # Debate CRUD operations
│   ├── recordingController.ts   # Audio recording management
│   └── evaluationController.ts  # Evaluation operations
├── routes/              # API route definitions
│   └── api.ts           # Main API router
├── middleware/          # Express middleware
│   └── errorHandler.ts  # Error handling & 404
├── services/            # Business logic
│   └── debateStore.ts   # In-memory data store
├── types/               # TypeScript types
│   └── index.ts         # API type definitions
├── utils/               # Utility functions
│   └── logger.ts        # Logging utility
└── server.ts            # Express app setup & server
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

This will start the server on `http://localhost:5000` with hot-reload via ts-node.

### Production Build

```bash
npm run build
npm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

### Debates

```
POST   /api/debates                           # Create new debate
GET    /api/debates                           # List all debates
GET    /api/debates/:debateId                 # Get specific debate
PATCH  /api/debates/:debateId/status          # Update debate status
GET    /api/debates/:debateId/results         # Get debate results
```

### Recordings

```
POST   /api/debates/:debateId/recordings      # Upload audio recording
GET    /api/debates/:debateId/recordings      # Get all debate recordings
GET    /api/recordings/:recordingId           # Get recording metadata
PATCH  /api/recordings/:recordingId           # Update recording (e.g., add transcription)
```

### Evaluations

```
POST   /api/debates/:debateId/evaluations                    # Create evaluation
GET    /api/debates/:debateId/evaluations                    # Get all evaluations
GET    /api/debates/:debateId/evaluations/:recordingId       # Get recording evaluation
GET    /api/debates/:debateId/teams/:team/evaluations        # Get team evaluations
```

## Environment Configuration

Create a `.env` file in the root directory (see `.env.example` for template):

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
MAX_FILE_SIZE=52428800
```

## Current Implementation

### Phase 1: Core Infrastructure ✅

- ✅ Express server setup with TypeScript
- ✅ CORS and request handling middleware
- ✅ Error handling and logging
- ✅ In-memory data store (for development)
- ✅ API route structure
- ✅ Type-safe controllers

### Phase 2: Database (PLANNED)

- PostgreSQL integration
- Database schema for debates, recordings, evaluations
- Connection pooling

### Phase 3: AI Integration (PLANNED)

- OpenAI Whisper API for speech-to-text
- OpenAI GPT-4 for debate evaluation
- Score generation and feedback

### Phase 4: Production Hardening (PLANNED)

- Authentication & authorization
- Input validation & sanitization
- Rate limiting
- Caching strategy
- Docker containerization

## Data Models

### DebateSession

```typescript
{
  id: string;                              // UUID
  config: {
    teamAName: string;
    teamBName: string;
    debateTopic: string;
    roundDurations: {
      introduccion: number;
      primerRefutador: number;
      segundoRefutador: number;
      conclusion: number;
    };
  };
  recordings: AudioRecordingMetadata[];    // Array of recordings
  evaluations: Evaluation[];               // Array of AI evaluations
  status: 'active' | 'completed' | 'archived';
  createdAt: string;                       // ISO timestamp
  updatedAt: string;                       // ISO timestamp
  totalScore?: {                           // Calculated after all evaluations
    teamA: number;
    teamB: number;
    winner?: 'A' | 'B';
  };
}
```

### AudioRecordingMetadata

```typescript
{
  id: string;                  // UUID
  debateId: string;            // Parent debate ID
  team: 'A' | 'B';             // Which team
  roundType: string;           // 'Introducción', 'Primer Refutador', etc.
  order: number;               // 1-8
  timestamp: string;           // ISO timestamp
  duration: number;            // Seconds
  fileUrl: string;             // URL to retrieve audio
  transcription?: string;      // Optional: speech-to-text
}
```

### Evaluation

```typescript
{
  id: string;                  // UUID
  debateId: string;            // Parent debate ID
  recordingId: string;         // Which recording
  team: 'A' | 'B';             // Which team
  roundType: string;           // Round type
  score: number;               // 0-100
  feedback: string;            // AI feedback
  strengths: string[];         // Identified strengths
  weaknesses: string[];        // Identified weaknesses
  timestamp: string;           // ISO timestamp
}
```

## Example API Calls

### Create a Debate

```bash
curl -X POST http://localhost:5000/api/debates \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "teamAName": "Team Alpha",
      "teamBName": "Team Beta",
      "debateTopic": "Should robots have rights?",
      "roundDurations": {
        "introduccion": 180,
        "primerRefutador": 240,
        "segundoRefutador": 240,
        "conclusion": 180
      }
    }
  }'
```

### Upload Recording

```bash
curl -X POST http://localhost:5000/api/debates/{debateId}/recordings \
  -F "audio=@recording.wav" \
  -F "team=A" \
  -F "roundType=Introducción" \
  -F "order=1" \
  -F "duration=185"
```

### Create Evaluation

```bash
curl -X POST http://localhost:5000/api/debates/{debateId}/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": "{recordingId}",
    "team": "A",
    "roundType": "Introducción",
    "score": 85,
    "feedback": "Strong opening with clear arguments",
    "strengths": ["Clear delivery", "Logical structure"],
    "weaknesses": ["Could cite more sources"]
  }'
```

## Next Steps

1. **Database Setup**: Replace in-memory store with PostgreSQL
2. **AI Integration**: Add OpenAI API integration for evaluations
3. **Transcription**: Implement speech-to-text processing
4. **Authentication**: Add JWT-based user authentication
5. **API Documentation**: Generate Swagger/OpenAPI documentation
6. **Testing**: Add unit and integration tests
7. **Deployment**: Containerize with Docker and deploy

## Error Handling

All endpoints return standardized JSON responses:

### Success Response

```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-29T12:00:00Z"
}
```

## Logging

The logger utility provides consistent logging:

```javascript
logger.info('Message', optionalData);
logger.warn('Warning', optionalData);
logger.error('Error', optionalData);
logger.debug('Debug', optionalData); // Only in development
```

## Development Notes

- The current implementation uses in-memory storage for data
- This is perfect for testing the API structure
- Database migration will happen in Phase 2
- File uploads are stored in memory (suitable for development)
- In production, implement persistent file storage (S3, local disk, etc.)

## Support

For issues or questions, visit: https://github.com/anomalyco/opencode
