/**
 * Tipos principales para la aplicación de debate competitivo
 */

export type TeamPosition = 'A' | 'B';
export type RoundType = 'Introducción' | 'Primer Refutador' | 'Segundo Refutador' | 'Conclusión';
export type DebateState = 'setup' | 'paused' | 'running' | 'finished';

/**
 * Definición de una ronda de debate
 */
export interface DebateRound {
  id: number;
  order: number;
  team: TeamPosition;
  roundType: RoundType;
  duration: number;
  audioRecording?: AudioRecording;
}

/**
 * Grabación de audio para cada intervención
 */
export interface AudioRecording {
  id: string;
  team: TeamPosition;
  roundType: RoundType;
  order: number;
  timestamp: string;
  duration: number;
  blob?: Blob;
  url?: string;
}

/**
 * Configuración inicial del debate
 */
export interface DebateConfig {
  teamAName: string;
  teamBName: string;
  debateTopic: string;
  roundDurations: {
    introduccion: number;
    primerRefutador: number;
    segundoRefutador: number;
    conclusion: number;
  };
}

/**
 * Estado completo del debate durante la competición
 */
export interface DebateSessionState {
  config: DebateConfig;
  state: DebateState;
  currentRoundIndex: number;
  currentTeam: TeamPosition;
  timeRemaining: number;
  isTimerRunning: boolean;
  recordings: AudioRecording[];
}

/**
 * Información de un equipo
 */
export interface TeamInfo {
  id: TeamPosition;
  name: string;
  isActive: boolean;
  timeRemaining: number;
  currentRoundType?: RoundType;
  roundOrder?: number;
}
