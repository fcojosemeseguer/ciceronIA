/**
 * Projects Service - Gestión de proyectos de debate
 */

import apiClient from './client';
import { Project, CreateProjectData } from '../types';

interface ProjectsResponse {
  message: string;
  result: Project[];
}

interface ProjectResponse {
  message: string;
  content: any[];
}

interface CreateProjectResponse {
  message: string;
  project_code: string;
  debate_type: string;
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
   * Obtener un proyecto específico
   */
  async getProject(projectCode: string): Promise<any[]> {
    const token = localStorage.getItem('ciceron_token');
    const response = await apiClient.post<ProjectResponse>('/get-project', {
      jwt: token,
      project_code: projectCode,
    });
    return response.data.content || [];
  },

  /**
   * Crear un nuevo proyecto
   */
  async createProject(data: CreateProjectData): Promise<{ project_code: string; debate_type: string }> {
    const token = localStorage.getItem('ciceron_token');
    const response = await apiClient.post<CreateProjectResponse>('/new-project', {
      jwt: token,
      name: data.name,
      description: data.description,
      debate_type: data.debate_type,
    });
    return {
      project_code: response.data.project_code,
      debate_type: response.data.debate_type,
    };
  },
};

export default projectsService;
