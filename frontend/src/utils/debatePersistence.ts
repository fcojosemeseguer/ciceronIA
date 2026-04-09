import { AnalysisResult, AudioRecording, AudioUpload, DebateConfig, DebateState, TeamPosition } from '../types';

interface PersistedAnalysisUpload {
  id: string;
  faseId: string;
  faseNombre: string;
  postura: string;
  numOradores: number;
  persistedFileName?: string;
  status: AudioUpload['status'];
  result?: AnalysisResult;
  error?: string;
  minutoOroUtilizado?: boolean;
  preguntasRealizadas?: number;
  preguntasRespondidas?: number;
  primerMinutoProtegido?: boolean;
}

export interface PersistedLiveDebateSession {
  debateCode: string;
  config: DebateConfig;
  state: DebateState;
  currentRoundIndex: number;
  currentTeam: TeamPosition;
  timeRemaining: number;
  isTimerRunning: boolean;
  recordings: AudioRecording[];
  analysisResults: AnalysisResult[];
  analysisQueue: { recordingId: string; status: 'pending' | 'analyzing' | 'completed' | 'error' }[];
  updatedAt: string;
}

const ANALYSIS_DRAFT_PREFIX = 'ciceronia.analysisDraft.';
const LIVE_DEBATE_PREFIX = 'ciceronia.liveDebate.';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadAnalysisDraft = (debateCode: string): PersistedAnalysisUpload[] => {
  if (!isBrowser()) return [];

  try {
    const raw = window.localStorage.getItem(`${ANALYSIS_DRAFT_PREFIX}${debateCode}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveAnalysisDraft = (debateCode: string, uploads: AudioUpload[]) => {
  if (!isBrowser()) return;

  const serializableUploads: PersistedAnalysisUpload[] = uploads.map((upload) => ({
    id: upload.id,
    faseId: upload.faseId,
    faseNombre: upload.faseNombre,
    postura: upload.postura,
    numOradores: upload.numOradores,
    persistedFileName: upload.file?.name || upload.persistedFileName,
    status: upload.status,
    result: upload.result,
    error: upload.error,
    minutoOroUtilizado: upload.minutoOroUtilizado,
    preguntasRealizadas: upload.preguntasRealizadas,
    preguntasRespondidas: upload.preguntasRespondidas,
    primerMinutoProtegido: upload.primerMinutoProtegido,
  }));

  try {
    window.localStorage.setItem(
      `${ANALYSIS_DRAFT_PREFIX}${debateCode}`,
      JSON.stringify(serializableUploads)
    );
  } catch {
    // Ignorar errores de cuota/serialización
  }
};

export const clearAnalysisDraft = (debateCode: string) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(`${ANALYSIS_DRAFT_PREFIX}${debateCode}`);
  } catch {
    // Ignorar errores
  }
};

export const loadLiveDebateSession = (debateCode: string): PersistedLiveDebateSession | null => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(`${LIVE_DEBATE_PREFIX}${debateCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedLiveDebateSession;
  } catch {
    return null;
  }
};

export const saveLiveDebateSession = (session: PersistedLiveDebateSession) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(
      `${LIVE_DEBATE_PREFIX}${session.debateCode}`,
      JSON.stringify(session)
    );
  } catch {
    // Ignorar errores de cuota/serialización
  }
};

export const clearLiveDebateSession = (debateCode: string) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.removeItem(`${LIVE_DEBATE_PREFIX}${debateCode}`);
  } catch {
    // Ignorar errores
  }
};
