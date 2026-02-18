/**
 * Configuración secuencial de rondas del debate
 * Soporta formatos UPCT (Académico) y RETOR
 */

import { DebateRound, RoundType, DebateConfig } from '../types';

// Secuencia para formato UPCT (Académico) - 8 rondas separadas
export const ROUNDS_SEQUENCE_UPCT: Omit<DebateRound, 'id' | 'duration'>[] = [
  { order: 1, team: 'A', roundType: 'Introducción' },
  { order: 2, team: 'B', roundType: 'Introducción' },
  { order: 3, team: 'A', roundType: 'Primer Refutador' },
  { order: 4, team: 'B', roundType: 'Primer Refutador' },
  { order: 5, team: 'A', roundType: 'Segundo Refutador' },
  { order: 6, team: 'B', roundType: 'Segundo Refutador' },
  { order: 7, team: 'B', roundType: 'Conclusión' },
  { order: 8, team: 'A', roundType: 'Conclusión' },
];

// Secuencia para formato RETOR
// Las fases son compartidas pero en Conclusión A va antes que B
export const ROUNDS_SEQUENCE_RETOR: Omit<DebateRound, 'id' | 'duration'>[] = [
  { order: 1, team: 'A', roundType: 'Contextualización' },
  { order: 2, team: 'B', roundType: 'Contextualización' },
  { order: 3, team: 'A', roundType: 'Definición' },
  { order: 4, team: 'B', roundType: 'Definición' },
  { order: 5, team: 'A', roundType: 'Valoración' },
  { order: 6, team: 'B', roundType: 'Valoración' },
  { order: 7, team: 'A', roundType: 'Conclusión' },  // A primero en RETOR
  { order: 8, team: 'B', roundType: 'Conclusión' },  // B segundo en RETOR
];

/**
 * Genera las rondas completas con duraciones específicas según el formato
 */
export function generateDebateRounds(config: DebateConfig): DebateRound[] {
  // Detectar formato por el tipo de duraciones o un flag en config
  const isRetor = config.roundDurations.introduccion === 360; // 6 min = RETOR
  
  const sequence = isRetor ? ROUNDS_SEQUENCE_RETOR : ROUNDS_SEQUENCE_UPCT;
  
  return sequence.map((round, idx) => ({
    ...round,
    id: idx,
    duration: getDurationForRoundType(round.roundType, config),
  }));
}

/**
 * Obtiene la duración de una ronda según el tipo
 */
function getDurationForRoundType(roundType: RoundType, config: DebateConfig): number {
  const durations = config.roundDurations;
  
  // Mapeo de tipos de ronda a duraciones
  switch (roundType) {
    case 'Introducción':
    case 'Contextualización':
      return durations.introduccion;
    case 'Primer Refutador':
    case 'Definición':
      return durations.primerRefutador;
    case 'Segundo Refutador':
    case 'Valoración':
      return durations.segundoRefutador;
    case 'Conclusión':
      return durations.conclusion;
    default:
      return 180;
  }
}

/**
 * Obtiene información de la ronda actual
 */
export function getCurrentRoundInfo(roundIndex: number, config: DebateConfig) {
  const rounds = generateDebateRounds(config);
  return rounds[roundIndex] || null;
}

/**
 * Verifica si es el último turno del debate
 */
export function isLastRound(roundIndex: number, config?: DebateConfig): boolean {
  const isRetor = config?.roundDurations.introduccion === 360;
  const sequence = isRetor ? ROUNDS_SEQUENCE_RETOR : ROUNDS_SEQUENCE_UPCT;
  return roundIndex >= sequence.length - 1;
}

/**
 * Obtiene el nombre de la ronda según el formato
 */
export function getRoundTypeLabel(roundType: RoundType, isRetor: boolean = false): string {
  if (isRetor) {
    // En RETOR mostrar nombres específicos
    switch (roundType) {
      case 'Contextualización':
        return 'Contextualización (RETOR)';
      case 'Definición':
        return 'Definición (RETOR)';
      case 'Valoración':
        return 'Valoración (RETOR)';
      case 'Conclusión':
        return 'Conclusión (RETOR)';
      default:
        return roundType;
    }
  }
  return roundType;
}
