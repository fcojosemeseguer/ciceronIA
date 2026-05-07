/**
 * Exportar todos los stores en un punto central
 */

export { useAuthStore, getAuthToken } from './authStore';
export { useDebateStore } from './debateStore';
export { useDebateHistoryStore } from './debateHistoryStore';
export { useProjectStore } from './projectStore';
export { useAnalysisStore } from './analysisStore';

// Nuevo store unificado (recomendado para nueva funcionalidad)
export { useDebateStore as useUnifiedDebateStore } from './debateStoreUnified';
