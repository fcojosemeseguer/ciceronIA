/**
 * Debates Service - Servicio unificado para gestión de debates
 * Reemplaza projectsService con interfaz simplificada
 * 
 * Nota: Este servicio mapea a los endpoints existentes de /projects
 * en el backend, pero proporciona una interfaz orientada a "debates".
 */

import apiClient from './client';
import { Debate, CreateDebateData, AnalysisResult, GetProjectRequestOptions, ProjectDashboardResponse, DebateMode, DebateStatus } from '../types';

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
  team_a_name?: string;
  team_b_name?: string;
  debate_topic?: string;
  mode?: string;
}

// Helper para normalizar backend response a tipo Debate
const normalizeDebate = (backendDebate: BackendDebate): Debate => ({
  ...backendDebate,
  code: backendDebate.code || backendDebate.project_code || '',
  description: backendDebate.description || backendDebate.desc || '',
  debate_topic: backendDebate.debate_topic || backendDebate.name || '',
  team_a_name: backendDebate.team_a_name || 'Equipo A',
  team_b_name: backendDebate.team_b_name || 'Equipo B',
  mode: (backendDebate.mode as DebateMode) || 'analysis',
  status: (backendDebate.status as DebateStatus) || 'draft',
});

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
  async createDebate(data: CreateDebateData): Promise<{ 
    debate_code: string; 
    debate_type: string; 
    team_a_name?: string; 
    team_b_name?: string; 
    debate_topic?: string;
    mode: DebateMode;
  }> {
    const response = await apiClient.post<CreateDebateResponse>('/new-project', {
      name: data.name,
      description: data.description,
      debate_type: data.debate_type,
      team_a_name: data.team_a_name,
      team_b_name: data.team_b_name,
      debate_topic: data.debate_topic,
      mode: data.mode,
    });
    return {
      debate_code: response.data.debate_code || response.data.project_code || '',
      debate_type: response.data.debate_type,
      team_a_name: response.data.team_a_name,
      team_b_name: response.data.team_b_name,
      debate_topic: response.data.debate_topic,
      mode: (response.data.mode as DebateMode) || data.mode,
    };
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
