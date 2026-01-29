/**
 * Configuración secuencial de rondas del debate
 * Sigue la estructura oficial de debate competitivo
 */

import { DebateRound, RoundType, DebateConfig } from '../types';

export const ROUNDS_SEQUENCE: Omit<DebateRound, 'id' | 'duration'>[] = [
  { order: 1, team: 'A', roundType: 'Introducción' },
  { order: 2, team: 'B', roundType: 'Introducción' },
  { order: 3, team: 'A', roundType: 'Primer Refutador' },
  { order: 4, team: 'B', roundType: 'Primer Refutador' },
  { order: 5, team: 'A', roundType: 'Segundo Refutador' },
  { order: 6, team: 'B', roundType: 'Segundo Refutador' },
  { order: 7, team: 'B', roundType: 'Conclusión' },
  { order: 8, team: 'A', roundType: 'Conclusión' },
];

/**
 * Genera las rondas completas con duraciones específicas
 */
export function generateDebateRounds(config: DebateConfig): DebateRound[] {
  return ROUNDS_SEQUENCE.map((round, idx) => ({
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
  switch (roundType) {
    case 'Introducción':
      return durations.introduccion;
    case 'Primer Refutador':
      return durations.primerRefutador;
    case 'Segundo Refutador':
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
export function isLastRound(roundIndex: number): boolean {
  return roundIndex >= ROUNDS_SEQUENCE.length - 1;
}
