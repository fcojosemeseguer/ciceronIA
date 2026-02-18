/**
 * Project Store - Gestión de proyectos de debate
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Project, DebateType, CreateProjectData } from '../types';
import { projectsService, debateTypesService } from '../api';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  debateTypes: DebateType[];
  selectedDebateType: DebateType | null;
  isLoading: boolean;
  error: string | null;
}

interface ProjectStore extends ProjectState {
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectData) => Promise<string>;
  selectProject: (project: Project | null) => void;
  fetchDebateTypes: () => Promise<void>;
  selectDebateType: (typeId: string) => void;
  clearError: () => void;
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  debateTypes: [],
  selectedDebateType: null,
  isLoading: false,
  error: null,
};

export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchProjects: async () => {
      set({ isLoading: true, error: null });
      try {
        const projects = await projectsService.getProjects();
        set({ projects, isLoading: false });
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al cargar proyectos', 
          isLoading: false 
        });
      }
    },

    createProject: async (data: CreateProjectData) => {
      set({ isLoading: true, error: null });
      try {
        const result = await projectsService.createProject(data);
        // Refetch projects after creation
        await get().fetchProjects();
        set({ isLoading: false });
        return result.project_code;
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al crear proyecto', 
          isLoading: false 
        });
        throw error;
      }
    },

    selectProject: (project: Project | null) => {
      set({ currentProject: project });
    },

    fetchDebateTypes: async () => {
      set({ isLoading: true, error: null });
      try {
        const debateTypes = await debateTypesService.getDebateTypes();
        set({ debateTypes, isLoading: false });
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al cargar tipos de debate', 
          isLoading: false 
        });
      }
    },

    selectDebateType: (typeId: string) => {
      const type = get().debateTypes.find(dt => dt.id === typeId);
      set({ selectedDebateType: type || null });
    },

    clearError: () => {
      set({ error: null });
    },
  }))
);

export default useProjectStore;
