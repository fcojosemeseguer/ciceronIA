/**
 * Unified Debate Store - Store unificado para gestión de debates
 * Reemplaza projectStore y debateHistoryStore
 * 
 * Funcionalidades:
 * - Lista de debates del usuario
 * - Creación de debates (modo live o analysis)
 * - Selección de debate actual
 * - Tipos de debate disponibles
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Debate, DebateType, CreateDebateData, DebateMode, DebateStatus } from '../types';
import { debatesService, debateTypesService } from '../api';

interface DebateState {
  // Listado de debates
  debates: Debate[];
  currentDebate: Debate | null;
  
  // Tipos de debate disponibles
  debateTypes: DebateType[];
  selectedDebateType: DebateType | null;
  
  // Estado UI
  isLoading: boolean;
  error: string | null;
  
  // Configuración temporal para nuevo debate
  draftConfig: Partial<CreateDebateData> | null;
}

interface DebateStore extends DebateState {
  // Acciones de listado
  fetchDebates: () => Promise<void>;
  refreshDebates: () => Promise<void>;
  
  // Acciones CRUD
  createDebate: (data: CreateDebateData) => Promise<string>;
  updateDebate: (code: string, data: Partial<Debate>) => Promise<void>;
  deleteDebate: (code: string) => Promise<void>;
  
  // Selección
  selectDebate: (debate: Debate | null) => void;
  getDebateByCode: (code: string) => Debate | undefined;
  
  // Tipos de debate
  fetchDebateTypes: () => Promise<void>;
  selectDebateType: (typeId: string) => void;
  
  // Draft/Configuración temporal
  setDraftConfig: (config: Partial<CreateDebateData> | null) => void;
  clearDraftConfig: () => void;
  
  // Utilidades
  clearError: () => void;
  
  // Getters computados
  getLiveDebates: () => Debate[];
  getAnalysisDebates: () => Debate[];
  getCompletedDebates: () => Debate[];
  getDebatesByStatus: (status: DebateStatus) => Debate[];
}

const initialState: DebateState = {
  debates: [],
  currentDebate: null,
  debateTypes: [],
  selectedDebateType: null,
  isLoading: false,
  error: null,
  draftConfig: null,
};

export const useDebateStore = create<DebateStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Fetch todos los debates del usuario
    fetchDebates: async () => {
      set({ isLoading: true, error: null });
      try {
        const debates = await debatesService.getDebates();
        set({ debates, isLoading: false });
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al cargar debates', 
          isLoading: false 
        });
      }
    },

    // Refrescar lista de debates
    refreshDebates: async () => {
      await get().fetchDebates();
    },

    // Crear nuevo debate
    createDebate: async (data: CreateDebateData) => {
      set({ isLoading: true, error: null });
      try {
        const result = await debatesService.createDebate(data);
        // Refrescar lista después de crear
        await get().fetchDebates();
        set({ isLoading: false });
        return result.debate_code;
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al crear debate', 
          isLoading: false 
        });
        throw error;
      }
    },

    // Actualizar debate existente
    updateDebate: async (code: string, data: Partial<Debate>) => {
      set({ isLoading: true, error: null });
      try {
        await debatesService.updateDebate(code, data);
        // Refrescar lista y actualizar current si es necesario
        await get().fetchDebates();
        const current = get().currentDebate;
        if (current && current.code === code) {
          const updated = get().debates.find(d => d.code === code);
          if (updated) {
            set({ currentDebate: updated });
          }
        }
        set({ isLoading: false });
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al actualizar debate', 
          isLoading: false 
        });
        throw error;
      }
    },

    // Eliminar debate
    deleteDebate: async (code: string) => {
      set({ isLoading: true, error: null });
      try {
        await debatesService.deleteDebate(code);
        // Refrescar lista
        await get().fetchDebates();
        // Limpiar current si era el eliminado
        const current = get().currentDebate;
        if (current && current.code === code) {
          set({ currentDebate: null });
        }
        set({ isLoading: false });
      } catch (error: any) {
        set({ 
          error: error.response?.data?.detail || 'Error al eliminar debate', 
          isLoading: false 
        });
        throw error;
      }
    },

    // Seleccionar debate actual
    selectDebate: (debate: Debate | null) => {
      set({ currentDebate: debate });
    },

    // Obtener debate por código
    getDebateByCode: (code: string) => {
      return get().debates.find(d => d.code === code);
    },

    // Fetch tipos de debate
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

    // Seleccionar tipo de debate
    selectDebateType: (typeId: string) => {
      const type = get().debateTypes.find(dt => dt.id === typeId);
      set({ selectedDebateType: type || null });
    },

    // Gestión de configuración temporal (draft)
    setDraftConfig: (config: Partial<CreateDebateData> | null) => {
      set({ draftConfig: config });
    },

    clearDraftConfig: () => {
      set({ draftConfig: null });
    },

    // Limpiar errores
    clearError: () => {
      set({ error: null });
    },

    // Getters computados
    getLiveDebates: () => {
      return get().debates.filter(d => d.mode === 'live');
    },

    getAnalysisDebates: () => {
      return get().debates.filter(d => d.mode === 'analysis');
    },

    getCompletedDebates: () => {
      return get().debates.filter(d => d.status === 'completed');
    },

    getDebatesByStatus: (status: DebateStatus) => {
      return get().debates.filter(d => d.status === status);
    },
  }))
);

export default useDebateStore;
