/**
 * Zustand Store - State Machine para el debate competitivo
 * Gestiona toda la lógica de estado global
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  DebateSessionState,
  DebateConfig,
  TeamPosition,
  AudioRecording,
  AnalysisResult,
} from '../types';
import {
  generateDebateRounds,
  getCurrentRoundInfo,
  isLastRound,
} from '../utils/roundsSequence';

// Estado inicial por defecto
const defaultConfig: DebateConfig = {
  teamAName: 'Equipo A',
  teamBName: 'Equipo B',
  debateTopic: 'Tema del Debate',
  roundDurations: {
    introduccion: 180,
    primerRefutador: 240,
    segundoRefutador: 240,
    conclusion: 180,
  },
};

const createInitialState = (config: DebateConfig): DebateSessionState & { analysisResults: AnalysisResult[]; analysisQueue: { recordingId: string; status: 'pending' | 'analyzing' | 'completed' | 'error' }[] } => ({
  config,
  state: 'setup',
  currentRoundIndex: 0,
  currentTeam: 'A',
  timeRemaining: config.roundDurations.introduccion,
  isTimerRunning: false,
  recordings: [],
  analysisResults: [],
  analysisQueue: [],
});

interface DebateStore extends DebateSessionState {
  // Estado de análisis en tiempo real
  analysisResults: AnalysisResult[];
  analysisQueue: { recordingId: string; status: 'pending' | 'analyzing' | 'completed' | 'error' }[];
  
  // Inicialización
  initializeDebate: (config: DebateConfig) => void;

  // Control de tiempo
  setTimeRemaining: (time: number) => void;
  decrementTime: () => void;
  setTimerRunning: (running: boolean) => void;

  // Control de flujo
  pauseDebate: () => void;
  resumeDebate: () => void;
  startDebate: () => void;
  skipToNextRound: () => void;
  goToNextTeamATurn: () => void;
  goToNextTeamBTurn: () => void;
  nextRound: () => void;
  previousRound: () => void;
  finishDebate: () => void;

  // Grabaciones
  addRecording: (recording: AudioRecording) => void;
  getRecordings: () => AudioRecording[];

  // Análisis en tiempo real
  addAnalysisResult: (result: AnalysisResult) => void;
  getAnalysisResults: () => AnalysisResult[];
  getTeamScoreFromAnalysis: (team: TeamPosition) => number;
  addToAnalysisQueue: (recordingId: string) => void;
  updateAnalysisQueueStatus: (recordingId: string, status: 'pending' | 'analyzing' | 'completed' | 'error') => void;

   // Getters
   getCurrentRound: () => ReturnType<typeof getCurrentRoundInfo>;
   getTeamName: (team: TeamPosition) => string;
   isLastRound: () => boolean;
   canGoToNextRound: () => boolean;
   canGoToPreviousRound: () => boolean;
   hasNextTeamATurn: () => boolean;
   hasNextTeamBTurn: () => boolean;
   canNavigateToTeamATurn: () => boolean;
   canNavigateToTeamBTurn: () => boolean;
}

export const useDebateStore = create<DebateStore>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    ...createInitialState(defaultConfig),

    // Inicialización
    initializeDebate: (config: DebateConfig) => {
      set({
        config,
        state: 'setup',
        currentRoundIndex: 0,
        currentTeam: 'A',
        timeRemaining: config.roundDurations.introduccion,
        isTimerRunning: false,
        recordings: [],
        analysisResults: [],
        analysisQueue: [],
      });
    },

    // Control de tiempo - AHORA PERMITE TIEMPO NEGATIVO (Tiempo Extra)
    setTimeRemaining: (time: number) => {
      // Ya no limitamos a 0, permitimos negativos para tiempo extra
      set({ timeRemaining: time });
    },

    decrementTime: () => {
      const state = get();
      // Siempre decrementamos, incluso si es negativo (tiempo extra)
      if (state.isTimerRunning) {
        get().setTimeRemaining(state.timeRemaining - 1);
      }
    },

    setTimerRunning: (running: boolean) => {
      set({ isTimerRunning: running });
    },

    // Control de flujo
    pauseDebate: () => {
      set({ state: 'paused', isTimerRunning: false });
    },

    resumeDebate: () => {
      const state = get();
      if (state.state === 'paused') {
        set({ state: 'running', isTimerRunning: true });
      }
    },

    startDebate: () => {
      set({ state: 'running', isTimerRunning: true });
    },

    skipToNextRound: () => {
      const state = get();
      const currentRound = state.getCurrentRound();

      if (!currentRound) return;

      if (isLastRound(state.currentRoundIndex)) {
        get().finishDebate();
        return;
      }

      const nextIndex = state.currentRoundIndex + 1;
      const nextRounds = generateDebateRounds(state.config);
      const nextRound = nextRounds[nextIndex];

      if (nextRound) {
        // Skip to next round and START the timer immediately
        set({
          currentRoundIndex: nextIndex,
          currentTeam: nextRound.team,
          timeRemaining: nextRound.duration,
          isTimerRunning: true, // Auto-start timer
          state: 'running', // Ensure running state
        });
      }
    },

    // Find next round where Team A speaks and skip to it
    goToNextTeamATurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      
      // Search from NEXT position (not current + 1, but just next)
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'A') {
          set({
            currentRoundIndex: i,
            currentTeam: 'A',
            timeRemaining: nextRounds[i].duration,
            isTimerRunning: true,
            state: 'running',
          });
          console.log(`🎬 Jumping to Team A turn at round ${i + 1}`);
          return;
        }
      }
    },

    // Find next round where Team B speaks and skip to it
    goToNextTeamBTurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      
      // Search from NEXT position (not current + 1, but just next)
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'B') {
          set({
            currentRoundIndex: i,
            currentTeam: 'B',
            timeRemaining: nextRounds[i].duration,
            isTimerRunning: true,
            state: 'running',
          });
          console.log(`🎬 Jumping to Team B turn at round ${i + 1}`);
          return;
        }
      }
    },

    nextRound: () => {
      const state = get();
      const currentRound = state.getCurrentRound();

      if (!currentRound) return;

      if (isLastRound(state.currentRoundIndex)) {
        get().finishDebate();
        return;
      }

      const nextIndex = state.currentRoundIndex + 1;
      const nextRounds = generateDebateRounds(state.config);
      const nextRound = nextRounds[nextIndex];

      if (nextRound) {
        set({
          currentRoundIndex: nextIndex,
          currentTeam: nextRound.team,
          timeRemaining: nextRound.duration,
          isTimerRunning: false, // Don't auto-start timer on nextRound
        });
      }
    },

    previousRound: () => {
      const state = get();

      if (state.currentRoundIndex <= 0) return;

      const prevIndex = state.currentRoundIndex - 1;
      const prevRounds = generateDebateRounds(state.config);
      const prevRound = prevRounds[prevIndex];

      if (prevRound) {
        set({
          currentRoundIndex: prevIndex,
          currentTeam: prevRound.team,
          timeRemaining: prevRound.duration,
          isTimerRunning: false, // Don't auto-start timer on previousRound
        });
      }
    },

    finishDebate: () => {
      set({ state: 'finished', isTimerRunning: false });
    },

    // Grabaciones
    addRecording: (recording: AudioRecording) => {
      const state = get();
      set({ recordings: [...state.recordings, recording] });
    },

    getRecordings: () => {
      return get().recordings;
    },

    // Análisis en tiempo real
    addAnalysisResult: (result: AnalysisResult) => {
      const state = get();
      set({ analysisResults: [...state.analysisResults, result] });
    },

    getAnalysisResults: () => {
      return get().analysisResults;
    },

    getTeamScoreFromAnalysis: (team: TeamPosition) => {
      const state = get();
      const postura = team === 'A' ? 'A Favor' : 'En Contra';
      
      const teamResults = state.analysisResults.filter(
        result => result.postura === postura
      );

      if (teamResults.length === 0) return 0;

      const totalScore = teamResults.reduce((sum, result) => sum + result.total, 0);
      return Math.round(totalScore / teamResults.length);
    },

    addToAnalysisQueue: (recordingId: string) => {
      const state = get();
      set({
        analysisQueue: [
          ...state.analysisQueue,
          { recordingId, status: 'pending' }
        ]
      });
    },

    updateAnalysisQueueStatus: (recordingId: string, status: 'pending' | 'analyzing' | 'completed' | 'error') => {
      const state = get();
      set({
        analysisQueue: state.analysisQueue.map(item =>
          item.recordingId === recordingId ? { ...item, status } : item
        )
      });
    },

    // Getters
    getCurrentRound: () => {
      const state = get();
      return getCurrentRoundInfo(state.currentRoundIndex, state.config);
    },

    getTeamName: (team: TeamPosition) => {
      const state = get();
      return team === 'A' ? state.config.teamAName : state.config.teamBName;
    },

    isLastRound: () => {
      const state = get();
      return isLastRound(state.currentRoundIndex);
    },

    canGoToNextRound: () => {
      const state = get();
      return !isLastRound(state.currentRoundIndex);
    },

    canGoToPreviousRound: () => {
      const state = get();
      return state.currentRoundIndex > 0;
    },

    hasNextTeamATurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'A') {
          return true;
        }
      }
      return false;
    },

    hasNextTeamBTurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'B') {
          return true;
        }
      }
      return false;
    },

    canNavigateToTeamATurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      
      // Detectar formato UPCT vs RETOR
      const isUpct = state.config.roundDurations.introduccion === 180; // 3 min = UPCT
      
      // Special case: Block Team A navigation from Round 6 (prevent 6→8 skip) ONLY in UPCT format
      // In UPCT: Round 6 (index 5) is B, Round 7 (index 6) is B (Conclusion), Round 8 (index 7) is A
      // We want to force going through Round 7 (B's Conclusion) before Round 8 (A's Conclusion)
      if (isUpct && state.currentRoundIndex === 5) {
        return false; // Block Turno A at Round 6 only in UPCT format
      }
      
      // Search for next Team A turn
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'A') {
          // Block only if Team A is currently active AND this is Team A's NEXT turn (not sequential)
          // In other words, allow navigation if going to the immediate next round
          if (state.currentTeam === 'A' && i !== state.currentRoundIndex + 1) {
            return false;
          }
          return true;
        }
      }
      return false;
    },

    canNavigateToTeamBTurn: () => {
      const state = get();
      const nextRounds = generateDebateRounds(state.config);
      
      // Search for next Team B turn
      for (let i = state.currentRoundIndex + 1; i < nextRounds.length; i++) {
        if (nextRounds[i].team === 'B') {
          // Block only if Team B is currently active AND this is Team B's NEXT turn (not sequential)
          // In other words, allow navigation if going to the immediate next round
          if (state.currentTeam === 'B' && i !== state.currentRoundIndex + 1) {
            return false;
          }
          return true;
        }
      }
      return false;
    },
   }))
);
