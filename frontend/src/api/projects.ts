/**
 * Projects Service - Gestión de proyectos de debate
 */

import apiClient from './client';
import { Project, CreateProjectData, AnalysisResult } from '../types';

interface ProjectsResponse {
  message: string;
  result: Project[];
}

interface ProjectResponse {
  message: string;
  project?: Project;
  content: AnalysisResult[];
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
  async getProjects(): Promise<Project[]> {
    const token = localStorage.getItem('ciceron_token');
    const response = await apiClient.post<ProjectsResponse>('/get-projects', { jwt: token });
    return response.data.result || [];
  },

  /**
   * Obtener un proyecto específico con sus análisis
   */
  async getProject(projectCode: string): Promise<{ project: Project | null; analyses: AnalysisResult[] }> {
    const token = localStorage.getItem('ciceron_token');
    const response = await apiClient.post<ProjectResponse>('/get-project', {
      jwt: token,
      project_code: projectCode,
    });
    return {
      project: response.data.project || null,
      analyses: response.data.content || [],
    };
  },

  /**
   * Crear un nuevo proyecto
   */
  async createProject(data: CreateProjectData): Promise<{ project_code: string; debate_type: string; team_a_name?: string; team_b_name?: string; debate_topic?: string }> {
    const token = localStorage.getItem('ciceron_token');
    const response = await apiClient.post<CreateProjectResponse>('/new-project', {
      jwt: token,
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
