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
  Project,
} from '../types';
import {
  generateDebateRounds,
  getCurrentRoundInfo,
  isLastRound,
} from '../utils/roundsSequence';
import { clearLiveDebateSession, loadLiveDebateSession, saveLiveDebateSession } from '../utils/debatePersistence';

// Estado inicial por defecto
const defaultConfig: DebateConfig = {
  teamAName: 'A favor',
  teamBName: 'En contra',
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

const persistCurrentSession = (state: Pick<DebateStore, 'currentDebateCode' | 'config' | 'state' | 'currentRoundIndex' | 'currentTeam' | 'timeRemaining' | 'isTimerRunning' | 'recordings' | 'analysisResults' | 'analysisQueue'>) => {
  if (!state.currentDebateCode) return;

  saveLiveDebateSession({
    debateCode: state.currentDebateCode,
    config: state.config,
    state: state.state,
    currentRoundIndex: state.currentRoundIndex,
    currentTeam: state.currentTeam,
    timeRemaining: state.timeRemaining,
    isTimerRunning: state.isTimerRunning,
    recordings: state.recordings,
    analysisResults: state.analysisResults,
    analysisQueue: state.analysisQueue,
    updatedAt: new Date().toISOString(),
  });
};

interface DebateStore extends DebateSessionState {
  currentDebateCode: string | null;
  // Estado de análisis en tiempo real
  analysisResults: AnalysisResult[];
  analysisQueue: { recordingId: string; status: 'pending' | 'analyzing' | 'completed' | 'error' }[];
  
  // Inicialización
  initializeDebate: (config: DebateConfig, debateCode?: string) => void;
  initializeDebateFromProject: (project: Project, debateCode?: string) => void;

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
    currentDebateCode: null,

    // Inicialización
    initializeDebate: (config: DebateConfig, debateCode?: string) => {
      const persistedSession = debateCode ? loadLiveDebateSession(debateCode) : null;

      if (persistedSession) {
        set({
          currentDebateCode: debateCode || persistedSession.debateCode,
          config: persistedSession.config,
          state: persistedSession.state,
          currentRoundIndex: persistedSession.currentRoundIndex,
          currentTeam: persistedSession.currentTeam,
          timeRemaining: persistedSession.timeRemaining,
          isTimerRunning: persistedSession.isTimerRunning,
          recordings: persistedSession.recordings,
          analysisResults: persistedSession.analysisResults,
          analysisQueue: persistedSession.analysisQueue,
        });
        return;
      }

      set({
        currentDebateCode: debateCode || null,
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
      persistCurrentSession(get());
    },

    // Inicializar debate desde un proyecto (unifica debate y proyecto)
    initializeDebateFromProject: (project: Project, debateCode?: string) => {
      // Determinar duraciones según el tipo de debate
      const isRetor = project.debate_type === 'retor';
      const roundDurations = isRetor
        ? {
            introduccion: 360,      // 6 minutos (Contextualización)
            primerRefutador: 120,   // 2 minutos (Definición)
            segundoRefutador: 300,  // 5 minutos (Valoración)
            conclusion: 180,        // 3 minutos
          }
        : {
            introduccion: 180,      // 3 minutos
            primerRefutador: 240,   // 4 minutos
            segundoRefutador: 240,  // 4 minutos
            conclusion: 180,        // 3 minutos
          };

      const config: DebateConfig = {
        teamAName: project.team_a_name || 'A favor',
        teamBName: project.team_b_name || 'En contra',
        debateTopic: project.debate_topic || project.name || 'Tema del Debate',
        roundDurations,
      };

      set({
        currentDebateCode: debateCode || project.code || null,
        config,
        state: 'setup',
        currentRoundIndex: 0,
        currentTeam: 'A',
        timeRemaining: roundDurations.introduccion,
        isTimerRunning: false,
        recordings: [],
        analysisResults: [],
        analysisQueue: [],
      });
      persistCurrentSession(get());
    },

    // Control de tiempo - AHORA PERMITE TIEMPO NEGATIVO (Tiempo Extra)
    setTimeRemaining: (time: number) => {
      // Ya no limitamos a 0, permitimos negativos para tiempo extra
      set({ timeRemaining: time });
      persistCurrentSession(get());
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
      persistCurrentSession(get());
    },

    // Control de flujo
    pauseDebate: () => {
      set({ state: 'paused', isTimerRunning: false });
      persistCurrentSession(get());
    },

    resumeDebate: () => {
      const state = get();
      if (state.state === 'paused') {
        set({ state: 'running', isTimerRunning: true });
        persistCurrentSession(get());
      }
    },

    startDebate: () => {
      set({ state: 'running', isTimerRunning: true });
      persistCurrentSession(get());
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
        persistCurrentSession(get());
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
          persistCurrentSession(get());
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
          persistCurrentSession(get());
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
        persistCurrentSession(get());
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
        persistCurrentSession(get());
      }
    },

    finishDebate: () => {
      set({ state: 'finished', isTimerRunning: false });
      const currentDebateCode = get().currentDebateCode;
      if (currentDebateCode) {
        clearLiveDebateSession(currentDebateCode);
      }
    },

    // Grabaciones
    addRecording: (recording: AudioRecording) => {
      const state = get();
      set({ recordings: [...state.recordings, recording] });
      persistCurrentSession(get());
    },

    getRecordings: () => {
      return get().recordings;
    },

    // Análisis en tiempo real
    addAnalysisResult: (result: AnalysisResult) => {
      const state = get();
      set({ analysisResults: [...state.analysisResults, result] });
      persistCurrentSession(get());
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
      persistCurrentSession(get());
    },

    updateAnalysisQueueStatus: (recordingId: string, status: 'pending' | 'analyzing' | 'completed' | 'error') => {
      const state = get();
      set({
        analysisQueue: state.analysisQueue.map(item =>
          item.recordingId === recordingId ? { ...item, status } : item
        )
      });
      persistCurrentSession(get());
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
