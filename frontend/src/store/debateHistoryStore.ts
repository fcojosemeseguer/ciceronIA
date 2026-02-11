/**
 * Debate History Store - Gestión del historial de debates
 * Almacena debates completados con puntuaciones y resúmenes
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DebateHistory } from '../types';

interface DebateHistoryStore {
  debates: DebateHistory[];
  selectedDebate: DebateHistory | null;
  isLoading: boolean;
  
  // Actions
  addDebate: (debate: DebateHistory) => void;
  selectDebate: (debate: DebateHistory | null) => void;
  deleteDebate: (debateId: string) => void;
  getDebateById: (debateId: string) => DebateHistory | undefined;
  getDebatesSortedByDate: () => DebateHistory[];
}

// Cargar desde localStorage (sin datos por defecto)
const loadDebates = (): DebateHistory[] => {
  const stored = localStorage.getItem('ciceron_debates');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
};

export const useDebateHistoryStore = create<DebateHistoryStore>()(
  subscribeWithSelector((set, get) => ({
    debates: loadDebates(),
    selectedDebate: null,
    isLoading: false,

    addDebate: (debate: DebateHistory) => {
      const newDebates = [debate, ...get().debates];
      localStorage.setItem('ciceron_debates', JSON.stringify(newDebates));
      set({ debates: newDebates });
    },

    selectDebate: (debate: DebateHistory | null) => {
      set({ selectedDebate: debate });
    },

    deleteDebate: (debateId: string) => {
      const newDebates = get().debates.filter(d => d.id !== debateId);
      localStorage.setItem('ciceron_debates', JSON.stringify(newDebates));
      set({ debates: newDebates });
    },

    getDebateById: (debateId: string) => {
      return get().debates.find(d => d.id === debateId);
    },

    getDebatesSortedByDate: () => {
      return [...get().debates].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    },
  }))
);
