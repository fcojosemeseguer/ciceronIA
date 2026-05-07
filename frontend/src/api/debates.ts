/**
 * Debates Service - Servicio unificado para gestión de debates
 * Reemplaza projectsService con interfaz simplificada
 * 
 * Nota: Este servicio mapea a los endpoints existentes de /projects
 * en el backend, pero proporciona una interfaz orientada a "debates".
 */

import apiClient from './client';
import { Debate, CreateDebateData, AnalysisResult, GetProjectRequestOptions, ProjectDashboardResponse, DebateMode, DebateStatus } from '../types';
import { loadDebateMetadata, saveDebateMetadata } from '../utils/debateMetadata';
import { loadLiveDebateSession } from '../utils/debatePersistence';

interface BackendDebate extends Omit<Debate, 'description' | 'mode' | 'status'> {
  description?: string;
  desc?: string;
  mode?: string;
  status?: string;
  project_code?: string;
}

interface DebatesResponse {
  message: string;
  result: BackendDebate[];
  items?: BackendDebate[];
  total?: number;
  limit?: number;
  offset?: number;
}

interface DebateResponse {
  message: string;
  project?: BackendDebate;
  debate?: BackendDebate;
  content: AnalysisResult[];
  dashboard?: ProjectDashboardResponse;
}

interface CreateDebateResponse {
  message: string;
  project_code?: string;
  debate_code?: string;
  debate_type: string;
  name?: string;
  description?: string;
  team_a_name?: string;
  team_b_name?: string;
  debate_topic?: string;
  mode?: string;
  status?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  user_code?: string;
}

const resolveDebateMode = (rawMode?: string, persistedMode?: DebateMode, debateCode?: string): DebateMode => {
  if (rawMode) {
    const normalized = rawMode.trim().toLowerCase();
    if (normalized === 'live' || normalized.includes('vivo')) return 'live';
    if (normalized === 'analysis' || normalized.includes('anal') || normalized.includes('audio') || normalized.includes('record')) return 'analysis';
  }
  if (debateCode && loadLiveDebateSession(debateCode)) {
    return 'live';
  }
  return persistedMode || 'analysis';
};

const normalizeDebateStatus = (rawStatus?: string): DebateStatus => {
  if (!rawStatus) return 'draft';
  const normalized = rawStatus.trim().toLowerCase();
  if (normalized === 'completed' || normalized === 'completado' || normalized === 'finished') return 'completed';
  if (normalized === 'in_progress' || normalized === 'in progress' || normalized === 'running' || normalized === 'paused') return 'in_progress';
  if (normalized === 'cancelled' || normalized === 'canceled') return 'cancelled';
  return 'draft';
};

// Helper para normalizar backend response a tipo Debate
const normalizeDebate = (backendDebate: BackendDebate): Debate => {
  const createdAtRaw = backendDebate.created_at;
  const createdAtTime = createdAtRaw ? new Date(createdAtRaw).getTime() : NaN;
  const debateCode = backendDebate.code || backendDebate.project_code || '';
  const persistedMetadata = loadDebateMetadata(debateCode);
  const normalizedMode = resolveDebateMode(backendDebate.mode, persistedMetadata?.mode, debateCode);
  const backendStatus = normalizeDebateStatus(backendDebate.status);
  const normalizedStatus =
    persistedMetadata?.finished && backendStatus !== 'cancelled' ? 'completed' : backendStatus;
  const normalizedCreatedTs = Number.isFinite(createdAtTime)
    ? createdAtTime
    : persistedMetadata?.created_ts || Date.now();
  const normalizedCreatedAt = Number.isFinite(createdAtTime)
    ? new Date(createdAtTime).toISOString()
    : new Date(normalizedCreatedTs).toISOString();

  if (debateCode) {
    saveDebateMetadata(debateCode, {
      mode: normalizedMode,
      created_ts: normalizedCreatedTs,
    });
  }

  return {
    ...backendDebate,
    code: debateCode,
    description: backendDebate.description || backendDebate.desc || '',
    debate_topic: backendDebate.debate_topic || backendDebate.name || '',
    team_a_name: backendDebate.team_a_name || 'A favor',
    team_b_name: backendDebate.team_b_name || 'En contra',
    mode: normalizedMode as DebateMode,
    status: normalizedStatus,
    created_at: normalizedCreatedAt,
    created_ts: normalizedCreatedTs,
  };
};

export const debatesService = {
  /**
   * Obtener todos los debates del usuario
   */
  async getDebates(params?: {
    q?: string;
    debate_type?: string;
    mode?: DebateMode;
    status?: DebateStatus;
    limit?: number;
    offset?: number;
  }): Promise<Debate[]> {
    const response = await apiClient.post<DebatesResponse>('/get-projects', {
      q: params?.q,
      debate_type: params?.debate_type,
      mode: params?.mode,
      status: params?.status,
      limit: params?.limit,
      offset: params?.offset,
    });
    const rawDebates = response.data.items || response.data.result || [];
    return rawDebates.map(normalizeDebate);
  },

  /**
   * Obtener un debate específico con sus análisis
   */
  async getDebate(
    debateCode: string,
    opts?: GetProjectRequestOptions
  ): Promise<{ debate: Debate | null; analyses: AnalysisResult[]; dashboard?: ProjectDashboardResponse }> {
    const response = await apiClient.post<DebateResponse>('/get-project', {
      project_code: debateCode,
      include_segments: opts?.include_segments ?? false,
      include_transcript: opts?.include_transcript ?? false,
      include_metrics: opts?.include_metrics ?? false,
      fase: opts?.fase ?? null,
      postura: opts?.postura ?? null,
      orador: opts?.orador ?? null,
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
    });

    const normalizedDebate: Debate | null = response.data.project || response.data.debate
      ? normalizeDebate(response.data.project || response.data.debate!)
      : null;

    return {
      debate: normalizedDebate,
      analyses: response.data.content || [],
      dashboard: response.data.dashboard,
    };
  },

  /**
   * Crear un nuevo debate
   */
  async createDebate(data: CreateDebateData): Promise<Debate> {
    const createdTs = Date.now();
    const createdAtISO = new Date(createdTs).toISOString();
    const response = await apiClient.post<CreateDebateResponse>('/new-project', {
      name: data.name,
      description: data.description,
      debate_type: data.debate_type,
      team_a_name: data.team_a_name,
      team_b_name: data.team_b_name,
      debate_topic: data.debate_topic,
      mode: data.mode,
    });
    const createdDebate = normalizeDebate({
      code: response.data.debate_code || response.data.project_code || '',
      name: response.data.name || data.name,
      description: response.data.description || data.description,
      debate_type: response.data.debate_type || data.debate_type,
      team_a_name: response.data.team_a_name || data.team_a_name,
      team_b_name: response.data.team_b_name || data.team_b_name,
      debate_topic: response.data.debate_topic || data.debate_topic,
      mode: response.data.mode || data.mode,
      status: response.data.status || 'draft',
      created_at: response.data.created_at || createdAtISO,
      started_at: response.data.started_at,
      completed_at: response.data.completed_at,
      user_code: response.data.user_code || '',
    });
    saveDebateMetadata(createdDebate.code, {
      mode: data.mode,
      created_ts: createdDebate.created_ts || createdTs,
      finished: false,
      finished_at: undefined,
    });
    return { ...createdDebate, mode: data.mode };
  },

  /**
   * Actualizar un debate existente
   */
  async updateDebate(debateCode: string, data: Partial<Debate>): Promise<void> {
    await apiClient.post('/update-project', {
      project_code: debateCode,
      name: data.name,
      description: data.description,
      debate_type: data.debate_type,
      team_a_name: data.team_a_name,
      team_b_name: data.team_b_name,
      debate_topic: data.debate_topic,
      status: data.status,
    });
  },

  /**
   * Eliminar un debate
   */
  async deleteDebate(debateCode: string): Promise<void> {
    await apiClient.post('/delete-project', {
      project_code: debateCode,
    });
  },

  /**
   * Actualizar estado del debate
   */
  async updateDebateStatus(debateCode: string, status: DebateStatus): Promise<void> {
    await apiClient.post('/update-project-status', {
      project_code: debateCode,
      status,
    });
  },
};

export default debatesService;
