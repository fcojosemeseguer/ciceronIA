/**
 * Debate Types Service - Obtener tipos de debate disponibles
 */

import apiClient from './client';
import { DebateType } from '../types';

interface DebateTypesResponse {
  debate_types: Array<{
    id: string;
    nombre: string;
    descripcion: string;
  }>;
}

// Fases por defecto para UPCT (Académico)
const UPCT_FASES = [
  { id: 'intro', nombre: 'Introducción', descripcion: 'Presentación inicial del equipo', tiempo_segundos: 180, permite_preguntas: true, permite_minuto_oro: false },
  { id: 'ref1', nombre: 'Primer Refutador', descripcion: 'Primera ronda de refutación', tiempo_segundos: 240, permite_preguntas: true, permite_minuto_oro: false },
  { id: 'ref2', nombre: 'Segundo Refutador', descripcion: 'Segunda ronda de refutación', tiempo_segundos: 240, permite_preguntas: true, permite_minuto_oro: false },
  { id: 'conc', nombre: 'Conclusión', descripcion: 'Cierre del debate', tiempo_segundos: 180, permite_preguntas: false, permite_minuto_oro: false },
];

// Fases por defecto para RETOR
const RETOR_FASES = [
  { id: 'context', nombre: 'Contextualización', descripcion: 'Contexto y marco del debate (6 min)', tiempo_segundos: 360, permite_preguntas: true, permite_minuto_oro: true },
  { id: 'defin', nombre: 'Definición', descripcion: 'Definición de conceptos clave (2 min)', tiempo_segundos: 120, permite_preguntas: true, permite_minuto_oro: true },
  { id: 'valor', nombre: 'Valoración', descripcion: 'Valoración y refutación (5 min)', tiempo_segundos: 300, permite_preguntas: true, permite_minuto_oro: true },
  { id: 'conc', nombre: 'Conclusión', descripcion: 'Cierre del debate - Orador único (3 min)', tiempo_segundos: 180, permite_preguntas: false, permite_minuto_oro: false, orador_unico: true },
];

export const debateTypesService = {
  /**
   * Obtener todos los tipos de debate disponibles
   */
  async getDebateTypes(): Promise<DebateType[]> {
    const response = await apiClient.get<DebateTypesResponse>('/debate-types');
    
    // Convertir la respuesta simplificada al formato completo con fases por defecto
    return response.data.debate_types.map((dt: { id: string; nombre: string; descripcion: string }) => ({
      id: dt.id,
      nombre: dt.nombre,
      descripcion: dt.descripcion,
      fases: dt.id === 'retor' ? RETOR_FASES : UPCT_FASES,
      posturas: ['A Favor', 'En Contra'],
      escala_min: dt.id === 'retor' ? 1 : 0,
      escala_max: dt.id === 'retor' ? 5 : 4,
      evaluation_mode: dt.id === 'retor' ? 'per_team' : 'per_speaker',
    }));
  },
};

export default debateTypesService;
