/**
 * Unified Debate Store - Store unificado para gestion de debates.
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Debate, DebateType, CreateDebateData, DebateStatus } from '../types';
import { debatesService, debateTypesService } from '../api';

interface DebateState {
  debates: Debate[];
  currentDebate: Debate | null;
  debateTypes: DebateType[];
  selectedDebateType: DebateType | null;
  isLoading: boolean;
  error: string | null;
  draftConfig: Partial<CreateDebateData> | null;
}

interface DebateStore extends DebateState {
  fetchDebates: () => Promise<void>;
  refreshDebates: () => Promise<void>;
  createDebate: (data: CreateDebateData) => Promise<Debate>;
  updateDebate: (code: string, data: Partial<Debate>) => Promise<void>;
  deleteDebate: (code: string) => Promise<void>;
  selectDebate: (debate: Debate | null) => void;
  getDebateByCode: (code: string) => Debate | undefined;
  fetchDebateTypes: () => Promise<void>;
  selectDebateType: (typeId: string) => void;
  setDraftConfig: (config: Partial<CreateDebateData> | null) => void;
  clearDraftConfig: () => void;
  clearError: () => void;
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

    fetchDebates: async () => {
      set({ isLoading: true, error: null });
      try {
        const debates = await debatesService.getDebates();
        set({ debates, isLoading: false });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Error al cargar debates',
          isLoading: false,
        });
      }
    },

    refreshDebates: async () => {
      await get().fetchDebates();
    },

    createDebate: async (data: CreateDebateData) => {
      set({ isLoading: true, error: null });
      try {
        const createdDebate = await debatesService.createDebate(data);

        set((state) => ({
          debates: [createdDebate, ...state.debates.filter((debate) => debate.code !== createdDebate.code)],
          currentDebate: createdDebate,
        }));

        await get().fetchDebates();
        set((state) => ({
          debates: state.debates.map((debate) =>
            debate.code === createdDebate.code
              ? { ...debate, mode: createdDebate.mode, status: debate.status || createdDebate.status }
              : debate
          ),
          currentDebate: {
            ...(state.debates.find((debate) => debate.code === createdDebate.code) || createdDebate),
            mode: createdDebate.mode,
            status: (state.debates.find((debate) => debate.code === createdDebate.code)?.status || createdDebate.status),
          },
          isLoading: false,
        }));

        return createdDebate;
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Error al crear debate',
          isLoading: false,
        });
        throw error;
      }
    },

    updateDebate: async (code: string, data: Partial<Debate>) => {
      set({ isLoading: true, error: null });
      try {
        await debatesService.updateDebate(code, data);
        await get().fetchDebates();
        const current = get().currentDebate;
        if (current && current.code === code) {
          const updated = get().debates.find((debate) => debate.code === code);
          if (updated) {
            set({ currentDebate: updated });
          }
        }
        set({ isLoading: false });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Error al actualizar debate',
          isLoading: false,
        });
        throw error;
      }
    },

    deleteDebate: async (code: string) => {
      set({ isLoading: true, error: null });
      try {
        await debatesService.deleteDebate(code);
        await get().fetchDebates();
        const current = get().currentDebate;
        if (current && current.code === code) {
          set({ currentDebate: null });
        }
        set({ isLoading: false });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Error al eliminar debate',
          isLoading: false,
        });
        throw error;
      }
    },

    selectDebate: (debate: Debate | null) => {
      set({ currentDebate: debate });
    },

    getDebateByCode: (code: string) => {
      return get().debates.find((debate) => debate.code === code);
    },

    fetchDebateTypes: async () => {
      set({ isLoading: true, error: null });
      try {
        const debateTypes = await debateTypesService.getDebateTypes();
        set({ debateTypes, isLoading: false });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Error al cargar tipos de debate',
          isLoading: false,
        });
      }
    },

    selectDebateType: (typeId: string) => {
      const type = get().debateTypes.find((debateType) => debateType.id === typeId);
      set({ selectedDebateType: type || null });
    },

    setDraftConfig: (config: Partial<CreateDebateData> | null) => {
      set({ draftConfig: config });
    },

    clearDraftConfig: () => {
      set({ draftConfig: null });
    },

    clearError: () => {
      set({ error: null });
    },

    getLiveDebates: () => {
      return get().debates.filter((debate) => debate.mode === 'live');
    },

    getAnalysisDebates: () => {
      return get().debates.filter((debate) => debate.mode === 'analysis');
    },

    getCompletedDebates: () => {
      return get().debates.filter((debate) => debate.status === 'completed');
    },

    getDebatesByStatus: (status: DebateStatus) => {
      return get().debates.filter((debate) => debate.status === status);
    },
  }))
);

export default useDebateStore;
