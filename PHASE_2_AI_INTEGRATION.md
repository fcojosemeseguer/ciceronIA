# CiceronAI Phase 2: AI Integration Plan

## Overview

Phase 2 adds AI judging capabilities using OpenAI's APIs:
- **Whisper API** - Convert speech recordings to text transcripts
- **GPT-4 API** - Analyze debates and generate evaluations with scoring

**Timeline:** 2-3 weeks  
**Complexity:** Medium  
**Dependencies:** Phase 1 (Complete ✅)

---

## Architecture

### Current System (Phase 1)
```
Frontend (React)
    ↓ records audio
    ↓ stores in state
    ↓ sends to backend
Backend (Express)
    ↓ saves recording metadata
    ↓ stores audio file path
PostgreSQL
    ↓ stores debate/recording info
```

### New System (Phase 2)
```
Frontend (React)
    ↓ records audio
    ↓ sends to backend
Backend (Express)
    ├─ saves recording metadata
    ├─ queues for AI processing
    └─ triggers background job
    
Whisper API (OpenAI)
    ↓ converts audio → transcript
    ↓ returns text
    
Background Job (Bull/Node Queue)
    ├─ receives transcript
    ├─ calls GPT-4 API
    │   ├─ speech quality score (0-100)
    │   ├─ argument strength (0-100)
    │   ├─ persuasiveness (0-100)
    │   └─ analysis text
    └─ stores in database
    
PostgreSQL
    ├─ stores transcripts
    └─ stores AI evaluations
    
Frontend (React)
    ↓ fetches results
    ↓ displays evaluations
```

---

## Implementation Phases

### Phase 2.1: Backend Setup (Week 1)
- [ ] Create `.env` variables for OpenAI API key
- [ ] Add `openai` npm package
- [ ] Create Whisper integration service
- [ ] Create GPT-4 integration service
- [ ] Test API calls manually

### Phase 2.2: Recording Processing (Week 1-2)
- [ ] Add `transcripts` table to database
- [ ] Add `evaluations` table enhancements
- [ ] Create background job queue (Bull or similar)
- [ ] Implement async processing
- [ ] Add job status tracking

### Phase 2.3: API Endpoints (Week 2)
- [ ] POST `/api/debates/{id}/process` - Start AI processing
- [ ] GET `/api/debates/{id}/transcripts` - Get speech transcripts
- [ ] GET `/api/debates/{id}/evaluations` - Get AI scores
- [ ] GET `/api/jobs/{jobId}/status` - Check processing status
- [ ] Webhook for completion notifications

### Phase 2.4: Frontend Integration (Week 2-3)
- [ ] Add "Evaluating..." status
- [ ] Show progress during processing
- [ ] Display evaluation results
- [ ] Create results dashboard
- [ ] Compare team scores

---

## Detailed Implementation Guide

### Step 1: Set Up OpenAI API Keys

**File:** `backend/.env`
```
OPENAI_API_KEY=sk-proj-...
OPENAI_ORG_ID=org-...
```

**Get keys from:**
1. Go to https://platform.openai.com/api/keys
2. Create new secret key
3. Save to `.env` file (never commit!)

---

### Step 2: Create Whisper Service

**File:** `backend/src/services/whisperService.ts`

```typescript
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface TranscriptResult {
  recordingId: string;
  debateId: string;
  teamId: 'A' | 'B';
  roundNumber: number;
  audioPath: string;
  transcript: string;
  duration: number;
  confidence: number;
}

export async function transcribeRecording(
  recordingId: string,
  audioPath: string,
  debateId: string,
  teamId: 'A' | 'B',
  roundNumber: number
): Promise<TranscriptResult> {
  try {
    // Read audio file
    const audioFile = fs.createReadStream(audioPath);
    
    // Call Whisper API
    const transcript = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es', // Spanish
      response_format: 'verbose_json',
    });

    return {
      recordingId,
      debateId,
      teamId,
      roundNumber,
      audioPath,
      transcript: transcript.text,
      duration: transcript.duration || 0,
      confidence: 0.95, // Whisper doesn't return confidence
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw error;
  }
}

export async function processAllRecordings(
  debateId: string,
  recordings: Array<{
    id: string;
    path: string;
    teamId: 'A' | 'B';
    roundNumber: number;
  }>
): Promise<TranscriptResult[]> {
  const results = await Promise.all(
    recordings.map(rec =>
      transcribeRecording(
        rec.id,
        rec.path,
        debateId,
        rec.teamId,
        rec.roundNumber
      )
    )
  );
  return results;
}
```

---

### Step 3: Create GPT-4 Evaluation Service

**File:** `backend/src/services/evaluationService.ts`

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface EvaluationScore {
  transcript: string;
  speechQuality: number; // 0-100
  argumentStrength: number; // 0-100
  persuasiveness: number; // 0-100
  overallScore: number; // 0-100
  analysis: string; // Detailed feedback
  strengths: string[];
  weaknesses: string[];
}

export async function evaluateRoundSpeech(
  teamId: 'A' | 'B',
  roundNumber: number,
  roundType: string,
  transcript: string,
  opposingTeamTranscript?: string
): Promise<EvaluationScore> {
  const prompt = `
You are an expert debate judge. Evaluate this debate speech and provide scores.

Team: ${teamId}
Round: ${roundNumber} (${roundType})
Speech Transcript:
${transcript}

${
  opposingTeamTranscript
    ? `Opposing Team's Speech:
${opposingTeamTranscript}`
    : ''
}

Provide evaluation in this exact JSON format:
{
  "speechQuality": <number 0-100>,
  "argumentStrength": <number 0-100>,
  "persuasiveness": <number 0-100>,
  "analysis": "<detailed feedback paragraph>",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"]
}

Consider:
- Clarity and articulation
- Logical arguments and evidence
- Refutation of opposing points
- Overall persuasiveness
- Speaking pace and tone
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert debate judge. Respond only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from GPT-4');

    const evaluation = JSON.parse(content);
    
    return {
      transcript,
      speechQuality: evaluation.speechQuality,
      argumentStrength: evaluation.argumentStrength,
      persuasiveness: evaluation.persuasiveness,
      overallScore: Math.round(
        (evaluation.speechQuality +
          evaluation.argumentStrength +
          evaluation.persuasiveness) /
          3
      ),
      analysis: evaluation.analysis,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
    };
  } catch (error) {
    console.error('GPT-4 evaluation error:', error);
    throw error;
  }
}

export async function evaluateFullDebate(
  debateId: string,
  teamATranscripts: string[],
  teamBTranscripts: string[],
  rounds: Array<{ number: number; type: string }>
): Promise<{
  debateId: string;
  teamAScore: number;
  teamBScore: number;
  teamAEvaluations: EvaluationScore[];
  teamBEvaluations: EvaluationScore[];
  winner: 'A' | 'B' | 'Tie';
  summary: string;
}> {
  // Evaluate each round for both teams
  const teamAEvaluations = await Promise.all(
    teamATranscripts.map((transcript, idx) =>
      evaluateRoundSpeech('A', idx + 1, rounds[idx].type, transcript, teamBTranscripts[idx])
    )
  );

  const teamBEvaluations = await Promise.all(
    teamBTranscripts.map((transcript, idx) =>
      evaluateRoundSpeech('B', idx + 1, rounds[idx].type, transcript, teamATranscripts[idx])
    )
  );

  const teamAScore = Math.round(
    teamAEvaluations.reduce((sum, e) => sum + e.overallScore, 0) /
      teamAEvaluations.length
  );

  const teamBScore = Math.round(
    teamBEvaluations.reduce((sum, e) => sum + e.overallScore, 0) /
      teamBEvaluations.length
  );

  let winner: 'A' | 'B' | 'Tie';
  if (teamAScore > teamBScore) winner = 'A';
  else if (teamBScore > teamAScore) winner = 'B';
  else winner = 'Tie';

  return {
    debateId,
    teamAScore,
    teamBScore,
    teamAEvaluations,
    teamBEvaluations,
    winner,
    summary: `Team ${winner} wins with score ${Math.max(teamAScore, teamBScore)}!`,
  };
}
```

---

### Step 4: Add Database Tables

**File:** `backend/src/services/migrations.ts` (add to existing migrations)

```typescript
export async function addAITables(client: any) {
  // Transcripts table
  await client.query(`
    CREATE TABLE IF NOT EXISTS transcripts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      recording_id UUID NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
      team_id VARCHAR(1) NOT NULL CHECK (team_id IN ('A', 'B')),
      round_number INT NOT NULL,
      text TEXT NOT NULL,
      duration FLOAT,
      confidence FLOAT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(debate_id, recording_id)
    );
  `);

  // AI Evaluations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS ai_evaluations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      transcript_id UUID NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
      team_id VARCHAR(1) NOT NULL CHECK (team_id IN ('A', 'B')),
      round_number INT NOT NULL,
      speech_quality INT CHECK (speech_quality >= 0 AND speech_quality <= 100),
      argument_strength INT CHECK (argument_strength >= 0 AND argument_strength <= 100),
      persuasiveness INT CHECK (persuasiveness >= 0 AND persuasiveness <= 100),
      overall_score INT CHECK (overall_score >= 0 AND overall_score <= 100),
      analysis TEXT,
      strengths TEXT[], -- PostgreSQL array
      weaknesses TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(debate_id, transcript_id)
    );
  `);

  // Processing Jobs table (for background processing)
  await client.query(`
    CREATE TABLE IF NOT EXISTS processing_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      debate_id UUID NOT NULL REFERENCES debates(id) ON DELETE CASCADE,
      job_type VARCHAR(50) NOT NULL, -- 'transcription' or 'evaluation'
      status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
      progress INT DEFAULT 0, -- 0-100
      error_message TEXT,
      started_at TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ AI tables created');
}
```

---

### Step 5: Create API Endpoints

**File:** `backend/src/routes/api.ts` (add to existing routes)

```typescript
// Start AI processing for a debate
app.post('/api/debates/:debateId/process', async (req, res) => {
  try {
    const { debateId } = req.params;
    const debate = await getDebate(debateId);
    
    if (!debate) {
      return res.status(404).json({ error: 'Debate not found' });
    }

    // Create processing job
    const job = await createProcessingJob(debateId, 'transcription');

    // Queue transcription for all recordings
    await queueTranscriptions(debateId, debate.recordingIds);

    res.json({
      debateId,
      jobId: job.id,
      status: 'queued',
      message: 'Processing started. Check status with job ID.',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transcripts for a debate
app.get('/api/debates/:debateId/transcripts', async (req, res) => {
  try {
    const { debateId } = req.params;
    const transcripts = await getTranscripts(debateId);
    res.json({ debateId, transcripts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI evaluations for a debate
app.get('/api/debates/:debateId/evaluations', async (req, res) => {
  try {
    const { debateId } = req.params;
    const evaluations = await getEvaluations(debateId);
    
    // Calculate scores
    const teamAScore = calculateTeamScore(evaluations, 'A');
    const teamBScore = calculateTeamScore(evaluations, 'B');

    res.json({
      debateId,
      teamAScore,
      teamBScore,
      winner: teamAScore > teamBScore ? 'A' : teamBScore > teamAScore ? 'B' : 'Tie',
      evaluations,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get processing job status
app.get('/api/jobs/:jobId/status', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId,
      status: job.status,
      progress: job.progress,
      error: job.error_message,
      startedAt: job.started_at,
      completedAt: job.completed_at,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Step 6: Frontend Results Dashboard

**File:** `frontend/src/components/screens/ResultsScreen.tsx` (new file)

```typescript
import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp, MessageCircle } from 'lucide-react';

interface EvaluationResult {
  teamId: 'A' | 'B';
  overallScore: number;
  speechQuality: number;
  argumentStrength: number;
  persuasiveness: number;
  analysis: string;
  strengths: string[];
  weaknesses: string[];
}

interface ResultsScreenProps {
  debateId: string;
  teamAName: string;
  teamBName: string;
  onRestart: () => void;
}

export const ResultsScreen: React.FC<ResultsScreenProps> = ({
  debateId,
  teamAName,
  teamBName,
  onRestart,
}) => {
  const [results, setResults] = useState<{
    teamAScore: number;
    teamBScore: number;
    winner: string;
    evaluations: EvaluationResult[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch evaluation results from backend
    fetch(`/api/debates/${debateId}/evaluations`)
      .then(res => res.json())
      .then(data => {
        setResults(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch results:', error);
        setLoading(false);
      });
  }, [debateId]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-black">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400 mb-4">
            🤖 Evaluando debate...
          </div>
          <div className="text-gray-400">Procesando transcripciones y análisis</div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 to-black">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400 mb-4">Error</div>
          <div className="text-gray-400">No se pudieron cargar los resultados</div>
          <button
            onClick={onRestart}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-purple-900 to-black overflow-auto">
      {/* Winner Banner */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-6 text-center">
        <Trophy className="w-12 h-12 mx-auto mb-2" />
        <h1 className="text-3xl font-bold">
          🎉 ¡{results.winner === 'Tie' ? 'Empate' : `Equipo ${results.winner} Gana`}!
        </h1>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-4 p-6">
        {/* Team A */}
        <div
          className={`p-6 rounded-lg border-2 ${
            results.winner === 'A'
              ? 'border-yellow-500 bg-yellow-900/20'
              : 'border-gray-600 bg-gray-900/20'
          }`}
        >
          <h2 className="text-2xl font-bold text-white mb-4">{teamAName}</h2>
          <div className="text-5xl font-bold text-purple-400 mb-4">
            {results.teamAScore}
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">Claridad:</span>
              <span className="ml-2 font-bold">{results.evaluations[0]?.speechQuality || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Argumentos:</span>
              <span className="ml-2 font-bold">{results.evaluations[0]?.argumentStrength || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Persuasión:</span>
              <span className="ml-2 font-bold">{results.evaluations[0]?.persuasiveness || 0}</span>
            </div>
          </div>
        </div>

        {/* Team B */}
        <div
          className={`p-6 rounded-lg border-2 ${
            results.winner === 'B'
              ? 'border-yellow-500 bg-yellow-900/20'
              : 'border-gray-600 bg-gray-900/20'
          }`}
        >
          <h2 className="text-2xl font-bold text-white mb-4">{teamBName}</h2>
          <div className="text-5xl font-bold text-purple-400 mb-4">
            {results.teamBScore}
          </div>
          <div className="space-y-2 text-sm text-gray-300">
            <div>
              <span className="text-gray-400">Claridad:</span>
              <span className="ml-2 font-bold">{results.evaluations[1]?.speechQuality || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Argumentos:</span>
              <span className="ml-2 font-bold">{results.evaluations[1]?.argumentStrength || 0}</span>
            </div>
            <div>
              <span className="text-gray-400">Persuasión:</span>
              <span className="ml-2 font-bold">{results.evaluations[1]?.persuasiveness || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div className="p-6 space-y-6">
        {results.evaluations.map((eval, idx) => (
          <div key={idx} className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Feedback para Team {eval.teamId}
            </h3>
            <p className="text-gray-300 mb-4">{eval.analysis}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-green-400 font-bold mb-2">Fortalezas</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  {eval.strengths.map((s, i) => (
                    <li key={i}>✓ {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-red-400 font-bold mb-2">Debilidades</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  {eval.weaknesses.map((w, i) => (
                    <li key={i}>✗ {w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <div className="p-6 text-center">
        <button
          onClick={onRestart}
          className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-lg transition"
        >
          Nuevo Debate
        </button>
      </div>
    </div>
  );
};
```

---

## Testing Phase 2

### Unit Tests
```typescript
// Test Whisper integration
test('should transcribe audio correctly', async () => {
  const result = await transcribeRecording(...);
  expect(result.transcript).toBeTruthy();
  expect(result.transcript.length).toBeGreaterThan(0);
});

// Test GPT-4 evaluation
test('should evaluate speech with scores', async () => {
  const eval = await evaluateRoundSpeech(...);
  expect(eval.overallScore).toBeGreaterThanOrEqual(0);
  expect(eval.overallScore).toBeLessThanOrEqual(100);
  expect(eval.analysis).toBeTruthy();
});
```

### Integration Tests
```typescript
// Test full pipeline
test('should process debate end-to-end', async () => {
  // 1. Create debate
  // 2. Process recordings
  // 3. Get transcripts
  // 4. Get evaluations
  // 5. Verify results
});
```

### Manual Testing
1. Start full system (frontend + backend + PostgreSQL)
2. Run a complete debate
3. Click "Ver Evaluación" button
4. Watch processing bar fill
5. See AI-generated scores and feedback

---

## Cost Estimation

**Monthly API Costs (100 debates, 8 rounds each):**

- **Whisper API**: $0.006/min audio
  - 800 recordings × 3 min avg = 2,400 min
  - Cost: ~$14.40/month

- **GPT-4 API**: ~$0.03/1K tokens
  - 800 evaluations × 400 tokens = 320K tokens
  - Cost: ~$9.60/month

- **Total**: ~$24/month (very affordable)

---

## Performance Considerations

### Processing Time
- Whisper: ~30 seconds per 3-minute recording
- GPT-4: ~5 seconds per evaluation
- Total for 8 rounds: ~4 minutes processing time

### Optimization Strategies
1. Process in parallel (not sequential)
2. Cache evaluations (don't re-evaluate)
3. Use GPT-3.5 for fast feedback (cheaper)
4. Use GPT-4 for final scoring (accurate)

---

## Rollout Plan

### Week 1: Backend Setup
- OpenAI API integration
- Whisper service creation
- Database schema updates

### Week 2: Processing Pipeline
- Background job queue setup
- Error handling & retries
- Job status tracking

### Week 3: Frontend Integration
- Results dashboard
- Processing UI
- Score display

### Week 4: Polish & Deploy
- Testing across scenarios
- Performance optimization
- Production deployment

---

## Monitoring & Maintenance

### Logging
```typescript
console.log(`[WHISPER] Starting transcription for ${recordingId}`);
console.log(`[GPT-4] Evaluating ${teamId} Round ${roundNumber}`);
console.log(`[JOB] ${jobId} completed in ${duration}ms`);
```

### Error Handling
- Retry failed API calls (3x with backoff)
- Log detailed errors to database
- Alert on consistent failures
- Graceful degradation (show "pending" instead of error)

### Metrics to Track
- Average processing time
- API success rate
- Cost per debate
- User satisfaction with evaluations

---

## Future Enhancements

### Phase 3: Advanced Features
1. **Comparative Analysis** - How does this debate compare to others?
2. **Improvement Tracking** - Show team progress over multiple debates
3. **Custom Rubrics** - Let users define custom evaluation criteria
4. **Multi-language** - Support debates in multiple languages
5. **Real-time Feedback** - Show scores as debate progresses

### Phase 4: Scaling
1. **Batch Processing** - Process multiple debates simultaneously
2. **Caching** - Cache common evaluations
3. **CDN for Audio** - Store recordings on S3/CloudFront
4. **Database Optimization** - Partitioning for large datasets

---

## Conclusion

Phase 2 transforms CiceronAI from a recording platform to an **AI-powered debate judging system**. With Whisper transcription and GPT-4 evaluation, users get instant, objective feedback on their debate performance.

**Status:** Ready to implement  
**Complexity:** Medium  
**Timeline:** 2-3 weeks  
**Cost:** ~$24/month for 100 debates
