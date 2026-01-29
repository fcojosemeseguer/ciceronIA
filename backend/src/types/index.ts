/**
 * Core types for CiceronAI backend
 */

export interface DebateConfig {
  teamAName: string;
  teamBName: string;
  debateTopic: string;
  roundDurations: {
    introduccion: number;
    primerRefutador: number;
    segundoRefutador: number;
    conclusion: number;
  };
}

export interface AudioRecordingMetadata {
  id: string;
  debateId: string;
  team: 'A' | 'B';
  roundType: 'Introducción' | 'Primer Refutador' | 'Segundo Refutador' | 'Conclusión';
  order: number;
  timestamp: string;
  duration: number;
  fileUrl: string;
  transcription?: string;
}

export interface Evaluation {
  id: string;
  debateId: string;
  recordingId: string;
  team: 'A' | 'B';
  roundType: string;
  score: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  timestamp: string;
}

export interface DebateSession {
  id: string;
  config: DebateConfig;
  recordings: AudioRecordingMetadata[];
  evaluations: Evaluation[];
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
  totalScore?: {
    teamA: number;
    teamB: number;
    winner?: 'A' | 'B';
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
