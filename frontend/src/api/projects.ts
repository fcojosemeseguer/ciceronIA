/**
 * Projects Service - Gestión de proyectos de debate
 */

import apiClient from './client';
import {
  Project,
  CreateProjectData,
  AnalysisResult,
  GetProjectRequestOptions,
  ProjectDashboardResponse,
} from '../types';

interface BackendProject extends Omit<Project, 'description'> {
  description?: string;
  desc?: string;
}

interface ProjectsResponse {
  message: string;
  result: BackendProject[];
  items?: BackendProject[];
  total?: number;
  limit?: number;
  offset?: number;
}

interface ProjectResponse {
  message: string;
  project?: BackendProject;
  content: AnalysisResult[];
  dashboard?: ProjectDashboardResponse;
}

interface CreateProjectResponse {
  message: string;
  project_code: string;
  debate_type: string;
  team_a_name?: string;
  team_b_name?: string;
  debate_topic?: string;
}

export const projectsService = {
  /**
   * Obtener todos los proyectos del usuario
   */
  async getProjects(params?: {
    q?: string;
    debate_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<Project[]> {
    const response = await apiClient.post<ProjectsResponse>('/get-projects', {
      q: params?.q,
      debate_type: params?.debate_type,
      limit: params?.limit,
      offset: params?.offset,
    });
    const rawProjects = response.data.items || response.data.result || [];
    return rawProjects.map((project) => ({
      ...project,
      description: project.description || project.desc || '',
    }));
  },

  /**
   * Obtener un proyecto específico con sus análisis
   */
  async getProject(
    projectCode: string,
    opts?: GetProjectRequestOptions
  ): Promise<{ project: Project | null; analyses: AnalysisResult[]; dashboard?: ProjectDashboardResponse }> {
    const response = await apiClient.post<ProjectResponse>('/get-project', {
      project_code: projectCode,
      include_segments: opts?.include_segments ?? false,
      include_transcript: opts?.include_transcript ?? false,
      include_metrics: opts?.include_metrics ?? false,
      fase: opts?.fase ?? null,
      postura: opts?.postura ?? null,
      orador: opts?.orador ?? null,
      limit: opts?.limit ?? 20,
      offset: opts?.offset ?? 0,
    });

    const normalizedProject: Project | null = response.data.project
      ? {
          ...response.data.project,
          description: response.data.project.description || response.data.project.desc || '',
        }
      : null;

    return {
      project: normalizedProject,
      analyses: response.data.content || [],
      dashboard: response.data.dashboard,
    };
  },

  /**
   * Crear un nuevo proyecto
   */
  async createProject(data: CreateProjectData): Promise<{ project_code: string; debate_type: string; team_a_name?: string; team_b_name?: string; debate_topic?: string }> {
    const response = await apiClient.post<CreateProjectResponse>('/new-project', {
      name: data.name,
      description: data.description,
      debate_type: data.debate_type,
      team_a_name: data.team_a_name,
      team_b_name: data.team_b_name,
      debate_topic: data.debate_topic,
    });
    return {
      project_code: response.data.project_code,
      debate_type: response.data.debate_type,
      team_a_name: response.data.team_a_name,
      team_b_name: response.data.team_b_name,
      debate_topic: response.data.debate_topic,
    };
  },
};

export default projectsService;
