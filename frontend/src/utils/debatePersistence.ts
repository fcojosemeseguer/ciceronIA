import {
  AnalysisResult,
  AudioRecording,
  AudioUpload,
  DebateConfig,
  DebateState,
  RoundType,
  TeamPosition,
} from '../types';

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

export interface LiveDebateDraftMeta {
  debateCode: string;
  roundId: string;
  team: TeamPosition;
  roundType: RoundType;
  order: number;
  totalDuration: number;
  segmentCount: number;
  updatedAt: string;
}

export interface LiveDebateDraftSegment {
  id: string;
  blob: Blob;
  duration: number;
  createdAt: string;
}

export interface LiveDebateDraft extends LiveDebateDraftMeta {
  segments: LiveDebateDraftSegment[];
}

const ANALYSIS_DRAFT_PREFIX = 'ciceronia.analysisDraft.';
const LIVE_DEBATE_PREFIX = 'ciceronia.liveDebate.';
const LIVE_DEBATE_DRAFT_PREFIX = 'ciceronia.liveDebateDraft.';
const LIVE_AUDIO_DB_NAME = 'ciceronia-live-audio';
const LIVE_AUDIO_SEGMENTS_STORE = 'draftSegments';

interface StoredLiveDebateDraftSegment extends LiveDebateDraftSegment {
  debateCode: string;
  roundId: string;
}

const memoryDraftSegments = new Map<string, StoredLiveDebateDraftSegment[]>();

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
const supportsIndexedDb = () => typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const getLiveDebateDraftKey = (debateCode: string) => `${LIVE_DEBATE_DRAFT_PREFIX}${debateCode}`;

const openLiveAudioDatabase = async (): Promise<IDBDatabase | null> => {
  if (!supportsIndexedDb()) return null;

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(LIVE_AUDIO_DB_NAME, 1);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(LIVE_AUDIO_SEGMENTS_STORE)) {
        const store = database.createObjectStore(LIVE_AUDIO_SEGMENTS_STORE, { keyPath: 'id' });
        store.createIndex('debateCode', 'debateCode', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB'));
  });
};

const loadStoredDraftSegments = async (debateCode: string): Promise<StoredLiveDebateDraftSegment[]> => {
  if (!supportsIndexedDb()) {
    return [...(memoryDraftSegments.get(debateCode) || [])];
  }

  const database = await openLiveAudioDatabase();
  if (!database) return [];

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(LIVE_AUDIO_SEGMENTS_STORE, 'readonly');
    const store = transaction.objectStore(LIVE_AUDIO_SEGMENTS_STORE);
    const index = store.index('debateCode');
    const request = index.getAll(debateCode);

    request.onsuccess = () => {
      resolve(((request.result || []) as StoredLiveDebateDraftSegment[]).sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt)
      ));
    };
    request.onerror = () => reject(request.error || new Error('No se pudieron leer los segmentos'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error || new Error('No se pudieron leer los segmentos'));
  });
};

const storeDraftSegment = async (segment: StoredLiveDebateDraftSegment) => {
  if (!supportsIndexedDb()) {
    const draftSegments = memoryDraftSegments.get(segment.debateCode) || [];
    memoryDraftSegments.set(segment.debateCode, [...draftSegments, segment]);
    return;
  }

  const database = await openLiveAudioDatabase();
  if (!database) return;

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LIVE_AUDIO_SEGMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(LIVE_AUDIO_SEGMENTS_STORE);
    store.put(segment);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('No se pudo guardar el segmento'));
  });

  database.close();
};

const removeDraftSegments = async (debateCode: string) => {
  if (!supportsIndexedDb()) {
    memoryDraftSegments.delete(debateCode);
    return;
  }

  const database = await openLiveAudioDatabase();
  if (!database) return;

  const segmentIds = await new Promise<string[]>((resolve, reject) => {
    const transaction = database.transaction(LIVE_AUDIO_SEGMENTS_STORE, 'readonly');
    const store = transaction.objectStore(LIVE_AUDIO_SEGMENTS_STORE);
    const index = store.index('debateCode');
    const request = index.getAllKeys(debateCode);

    request.onsuccess = () => resolve((request.result || []) as string[]);
    request.onerror = () => reject(request.error || new Error('No se pudieron localizar los segmentos'));
  });

  if (segmentIds.length === 0) {
    database.close();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(LIVE_AUDIO_SEGMENTS_STORE, 'readwrite');
    const store = transaction.objectStore(LIVE_AUDIO_SEGMENTS_STORE);

    segmentIds.forEach((segmentId) => {
      store.delete(segmentId);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('No se pudieron borrar los segmentos'));
  });

  database.close();
};

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
    const serializableRecordings = session.recordings.map(({ blob, url, ...recording }) => recording);
    window.localStorage.setItem(
      `${LIVE_DEBATE_PREFIX}${session.debateCode}`,
      JSON.stringify({
        ...session,
        recordings: serializableRecordings,
      })
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

export const getLiveDebateDraftMeta = (debateCode: string): LiveDebateDraftMeta | null => {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getLiveDebateDraftKey(debateCode));
    if (!raw) return null;
    return JSON.parse(raw) as LiveDebateDraftMeta;
  } catch {
    return null;
  }
};

export const appendLiveDebateDraftSegment = async (
  meta: Omit<LiveDebateDraftMeta, 'segmentCount' | 'totalDuration' | 'updatedAt'>,
  segment: LiveDebateDraftSegment
) => {
  const currentMeta = getLiveDebateDraftMeta(meta.debateCode);

  if (currentMeta && currentMeta.roundId !== meta.roundId) {
    await clearLiveDebateDraft(meta.debateCode);
  }

  await storeDraftSegment({
    ...segment,
    debateCode: meta.debateCode,
    roundId: meta.roundId,
  });

  const nextMeta: LiveDebateDraftMeta = {
    ...meta,
    segmentCount: currentMeta?.roundId === meta.roundId ? currentMeta.segmentCount + 1 : 1,
    totalDuration:
      (currentMeta?.roundId === meta.roundId ? currentMeta.totalDuration : 0) + segment.duration,
    updatedAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(getLiveDebateDraftKey(meta.debateCode), JSON.stringify(nextMeta));
  }

  return nextMeta;
};

export const loadLiveDebateDraft = async (debateCode: string): Promise<LiveDebateDraft | null> => {
  const meta = getLiveDebateDraftMeta(debateCode);
  if (!meta) return null;

  const segments = (await loadStoredDraftSegments(debateCode)).filter(
    (segment) => segment.roundId === meta.roundId
  );

  if (segments.length === 0) {
    await clearLiveDebateDraft(debateCode);
    return null;
  }

  return {
    ...meta,
    segments: segments.map(({ id, blob, duration, createdAt }) => ({
      id,
      blob,
      duration,
      createdAt,
    })),
  };
};

export const clearLiveDebateDraft = async (debateCode: string) => {
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(getLiveDebateDraftKey(debateCode));
    } catch {
      // Ignorar errores
    }
  }

  await removeDraftSegments(debateCode);
};
