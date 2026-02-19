/**
 * Analysis Store - Gestión del análisis de audios
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AudioUpload, AnalysisResult, Project, DebateType } from '../types';
import { analysisService } from '../api';
import { normalizePhaseName } from '../utils/roundsSequence';

interface AnalysisState {
  uploads: AudioUpload[];
  isAnalyzing: boolean;
  globalProgress: number;
  error: string | null;
  currentProject: Project | null;
}

interface AnalysisStore extends AnalysisState {
  // Actions
  addUpload: (upload: AudioUpload) => void;
  removeUpload: (id: string) => void;
  updateUploadStatus: (id: string, status: AudioUpload['status'], updates?: Partial<AudioUpload>) => void;
  analyseAudio: (uploadId: string, project: Project, debateType: DebateType | null) => Promise<void>;
  analyseAll: (project: Project, debateType: DebateType | null) => Promise<void>;
  selectProject: (project: Project | null) => void;
  clearUploads: () => void;
  clearError: () => void;
  getCompletedCount: () => number;
  getTotalCount: () => number;
}

const initialState: AnalysisState = {
  uploads: [],
  isAnalyzing: false,
  globalProgress: 0,
  error: null,
  currentProject: null,
};

export const useAnalysisStore = create<AnalysisStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    addUpload: (upload: AudioUpload) => {
      set(state => ({
        uploads: [...state.uploads, upload],
      }));
    },

    removeUpload: (id: string) => {
      set(state => ({
        uploads: state.uploads.filter(u => u.id !== id),
      }));
    },

    updateUploadStatus: (id: string, status: AudioUpload['status'], updates?: Partial<AudioUpload>) => {
      set(state => ({
        uploads: state.uploads.map(u => 
          u.id === id ? { ...u, status, ...updates } : u
        ),
      }));
      
      // Actualizar progreso global
      const completed = get().uploads.filter(u => u.status === 'completed').length;
      const total = get().uploads.length;
      const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
      set({ globalProgress: progress });
    },

    analyseAudio: async (uploadId: string, project: Project, debateType: DebateType | null) => {
      const upload = get().uploads.find(u => u.id === uploadId);
      if (!upload || !upload.file || !upload.wavBlob) return;

      const token = localStorage.getItem('ciceron_token');
      if (!token) {
        set({ error: 'No hay sesión activa' });
        return;
      }

      if (!project) {
        set({ error: 'Se requiere un proyecto para el análisis' });
        return;
      }

      get().updateUploadStatus(uploadId, 'analyzing', { progress: 0 });

      try {
        let result: AnalysisResult;

        // Análisis con proyecto (siempre requiere proyecto)
        result = await analysisService.analyse({
          fase: normalizePhaseName(upload.faseNombre),
          postura: upload.postura,
          orador: `${upload.numOradores} oradores`,
          num_speakers: upload.numOradores,
          project_code: project.code,
          jwt: token,
          file: new File([upload.wavBlob], 'audio.wav', { type: 'audio/wav' }),
          // Campos opcionales de configuración
          minuto_oro_utilizado: upload.minutoOroUtilizado,
          preguntas_realizadas: upload.preguntasRealizadas,
          preguntas_respondidas: upload.preguntasRespondidas,
        });

        get().updateUploadStatus(uploadId, 'completed', { 
          result,
          progress: 100 
        });
      } catch (error: any) {
        get().updateUploadStatus(uploadId, 'error', { 
          error: error.response?.data?.detail || error.message || 'Error en el análisis'
        });
        set({ 
          error: error.response?.data?.detail || 'Error en el análisis',
          isAnalyzing: false 
        });
      }
    },

    analyseAll: async (project: Project, debateType: DebateType | null) => {
      const pendingUploads = get().uploads.filter(u => 
        u.status === 'pending' && u.file && u.wavBlob
      );

      if (pendingUploads.length === 0) return;

      set({ isAnalyzing: true, error: null });

      // Analizar secuencialmente para no sobrecargar el backend
      for (const upload of pendingUploads) {
        await get().analyseAudio(upload.id, project, debateType);
      }

      set({ isAnalyzing: false });
    },

    selectProject: (project: Project | null) => {
      set({ currentProject: project });
    },

    clearUploads: () => {
      set({ uploads: [], globalProgress: 0 });
    },

    clearError: () => {
      set({ error: null });
    },

    getCompletedCount: () => {
      return get().uploads.filter(u => u.status === 'completed').length;
    },

    getTotalCount: () => {
      return get().uploads.length;
    },
  }))
);

export default useAnalysisStore;
