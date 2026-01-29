# CiceronAI Backend - API Documentation

## Quick Start

Once the backend is running, access the interactive API documentation at:

```
http://localhost:5000/api/docs
```

This is an interactive Swagger UI where you can:
- View all available endpoints
- Test API calls directly from the browser
- See request/response examples
- Understand parameter requirements

## API Overview

### Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://api.ciceron-ai.com`

### Authentication

Currently, the API does not require authentication. Authentication will be added in a future release using JWT tokens.

### Response Format

All API responses follow a consistent JSON format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-29T12:00:00Z"
}
```

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid input |
| 404 | Not Found - Resource does not exist |
| 500 | Internal Server Error |

## Endpoints Reference

### Health Check

#### `GET /api/health`

Check if the server is running.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok"
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

## Debates

### Create Debate

#### `POST /api/debates`

Create a new debate session.

**Request Body:**
```json
{
  "config": {
    "teamAName": "Team Alpha",
    "teamBName": "Team Beta",
    "debateTopic": "Should artificial intelligence be regulated?",
    "roundDurations": {
      "introduccion": 180,
      "primerRefutador": 240,
      "segundoRefutador": 240,
      "conclusion": 180
    }
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "config": { /* config from request */ },
    "recordings": [],
    "evaluations": [],
    "status": "active",
    "createdAt": "2024-01-29T12:00:00Z",
    "updatedAt": "2024-01-29T12:00:00Z"
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### List Debates

#### `GET /api/debates`

Retrieve all debate sessions.

**Query Parameters:** None

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "config": { /* debate config */ },
      "recordings": [ /* recordings */ ],
      "evaluations": [ /* evaluations */ ],
      "status": "active",
      "createdAt": "2024-01-29T12:00:00Z",
      "updatedAt": "2024-01-29T12:00:00Z"
    }
  ],
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### Get Debate

#### `GET /api/debates/{debateId}`

Retrieve a specific debate with all its recordings and evaluations.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "config": { /* debate config */ },
    "recordings": [ /* all recordings */ ],
    "evaluations": [ /* all evaluations */ ],
    "status": "active",
    "createdAt": "2024-01-29T12:00:00Z",
    "updatedAt": "2024-01-29T12:00:00Z",
    "totalScore": {
      "teamA": 425,
      "teamB": 410,
      "winner": "A"
    }
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### Update Debate Status

#### `PATCH /api/debates/{debateId}/status`

Change the status of a debate.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid Status Values:** `active`, `completed`, `archived`

**Response (200):** Updated debate object

---

### Get Debate Results

#### `GET /api/debates/{debateId}/results`

Get debate results with all evaluations and total scores.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Response (200):**
```json
{
  "success": true,
  "data": {
    "debate": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "config": { /* config */ },
      "status": "completed",
      "createdAt": "2024-01-29T12:00:00Z"
    },
    "evaluations": [
      {
        "id": "evaluation-uuid",
        "team": "A",
        "roundType": "Introducción",
        "score": 85,
        "feedback": "Strong opening with clear arguments",
        "strengths": ["Clear delivery", "Logical structure"],
        "weaknesses": ["Could cite more sources"]
      }
    ],
    "totalScore": {
      "teamA": 425,
      "teamB": 410,
      "winner": "A"
    }
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

## Recordings

### Upload Recording

#### `POST /api/debates/{debateId}/recordings`

Upload audio recording for a debate round.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Request Body (multipart/form-data):**
- `audio` (file, required): Audio file (WAV, MP3, WebM, OGG)
- `team` (string, required): 'A' or 'B'
- `roundType` (string, required): Type of round (e.g., 'Introducción')
- `order` (integer, required): Round order (1-8)
- `duration` (number, required): Duration in seconds

**Example using curl:**
```bash
curl -X POST http://localhost:5000/api/debates/{debateId}/recordings \
  -F "audio=@recording.wav" \
  -F "team=A" \
  -F "roundType=Introducción" \
  -F "order=1" \
  -F "duration=185"
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "recording-uuid",
    "debateId": "550e8400-e29b-41d4-a716-446655440000",
    "team": "A",
    "roundType": "Introducción",
    "order": 1,
    "timestamp": "2024-01-29T12:00:00Z",
    "duration": 185,
    "fileUrl": "/api/recordings/recording-uuid/audio",
    "transcription": null
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### List Debate Recordings

#### `GET /api/debates/{debateId}/recordings`

Get all recordings for a debate.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "recording-uuid",
      "debateId": "550e8400-e29b-41d4-a716-446655440000",
      "team": "A",
      "roundType": "Introducción",
      "order": 1,
      "timestamp": "2024-01-29T12:00:00Z",
      "duration": 185,
      "fileUrl": "/api/recordings/recording-uuid/audio",
      "transcription": "Speech text here..."
    }
  ],
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### Get Recording Metadata

#### `GET /api/recordings/{recordingId}`

Get metadata for a specific recording.

**Parameters:**
- `recordingId` (path, required): UUID of the recording

**Response (200):** Recording object (same structure as above)

---

### Update Recording

#### `PATCH /api/recordings/{recordingId}`

Update recording metadata (e.g., add transcription).

**Parameters:**
- `recordingId` (path, required): UUID of the recording

**Request Body:**
```json
{
  "transcription": "Full transcription of the recorded speech..."
}
```

**Response (200):** Updated recording object

---

## Evaluations

### Create Evaluation

#### `POST /api/debates/{debateId}/evaluations`

Create AI evaluation for a recording.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Request Body:**
```json
{
  "recordingId": "recording-uuid",
  "team": "A",
  "roundType": "Introducción",
  "score": 85,
  "feedback": "Strong opening with clear arguments and good delivery.",
  "strengths": [
    "Clear articulation",
    "Well structured",
    "Engaging delivery"
  ],
  "weaknesses": [
    "Could provide more examples",
    "Pacing could be improved"
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "evaluation-uuid",
    "debateId": "550e8400-e29b-41d4-a716-446655440000",
    "recordingId": "recording-uuid",
    "team": "A",
    "roundType": "Introducción",
    "score": 85,
    "feedback": "Strong opening...",
    "strengths": ["Clear articulation", "Well structured", "Engaging delivery"],
    "weaknesses": ["Could provide more examples", "Pacing could be improved"],
    "timestamp": "2024-01-29T12:00:00Z"
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

### List Debate Evaluations

#### `GET /api/debates/{debateId}/evaluations`

Get all evaluations for a debate.

**Parameters:**
- `debateId` (path, required): UUID of the debate

**Response (200):** Array of evaluation objects

---

### Get Recording Evaluation

#### `GET /api/debates/{debateId}/evaluations/{recordingId}`

Get evaluation for a specific recording.

**Parameters:**
- `debateId` (path, required): UUID of the debate
- `recordingId` (path, required): UUID of the recording

**Response (200):** Single evaluation object

---

### Get Team Evaluations

#### `GET /api/debates/{debateId}/teams/{team}/evaluations`

Get all evaluations for a team with aggregate scores.

**Parameters:**
- `debateId` (path, required): UUID of the debate
- `team` (path, required): 'A' or 'B'

**Response (200):**
```json
{
  "success": true,
  "data": {
    "team": "A",
    "evaluations": [ /* all evaluations for team */ ],
    "totalScore": 425,
    "averageScore": 85.5
  },
  "timestamp": "2024-01-29T12:00:00Z"
}
```

---

## Error Handling

The API returns descriptive error messages. Common error codes:

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_INPUT` | 400 | Missing or invalid required fields |
| `INVALID_TEAM` | 400 | Team must be 'A' or 'B' |
| `INVALID_STATUS` | 400 | Invalid status value |
| `INVALID_SCORE` | 400 | Score must be 0-100 |
| `NO_FILE` | 400 | No audio file provided |
| `DEBATE_NOT_FOUND` | 404 | Specified debate doesn't exist |
| `RECORDING_NOT_FOUND` | 404 | Specified recording doesn't exist |
| `EVALUATION_NOT_FOUND` | 404 | Evaluation doesn't exist |
| `STORE_FAILED` | 500 | Database operation failed |

---

## Examples

### Complete Debate Flow

```bash
# 1. Create a debate
curl -X POST http://localhost:5000/api/debates \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "teamAName": "Robotics Club",
      "teamBName": "Ethics Committee",
      "debateTopic": "Should robots have legal rights?",
      "roundDurations": {
        "introduccion": 180,
        "primerRefutador": 240,
        "segundoRefutador": 240,
        "conclusion": 180
      }
    }
  }'

# Response will include debate ID

# 2. Upload recordings (repeat for each round)
curl -X POST http://localhost:5000/api/debates/{debateId}/recordings \
  -F "audio=@team_a_intro.wav" \
  -F "team=A" \
  -F "roundType=Introducción" \
  -F "order=1" \
  -F "duration=185"

# 3. Create evaluations (repeat for each recording)
curl -X POST http://localhost:5000/api/debates/{debateId}/evaluations \
  -H "Content-Type: application/json" \
  -d '{
    "recordingId": "{recordingId}",
    "team": "A",
    "roundType": "Introducción",
    "score": 85,
    "feedback": "Excellent introduction",
    "strengths": ["Clear", "Engaging"],
    "weaknesses": ["Too fast"]
  }'

# 4. Get results
curl http://localhost:5000/api/debates/{debateId}/results
```

---

## Interactive Testing

Use the Swagger UI at `http://localhost:5000/api/docs` to test all endpoints interactively. This is the easiest way to understand the API without writing curl commands.

## Next Steps

- Phase 3: AI Integration (Whisper + GPT-4)
- Phase 4: Authentication & Authorization
- Phase 5: Production Hardening
