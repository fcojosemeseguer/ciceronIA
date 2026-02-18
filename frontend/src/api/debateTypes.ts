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

export const debateTypesService = {
  /**
   * Obtener todos los tipos de debate disponibles
   */
  async getDebateTypes(): Promise<DebateType[]> {
    const response = await apiClient.get<DebateTypesResponse>('/debate-types');
    
    // Convertir la respuesta simplificada al formato completo
    // Nota: El backend actual solo devuelve id, nombre, descripcion
    // Las fases completas las obtenemos del backend cuando seleccionamos un tipo
    return response.data.debate_types.map((dt: { id: string; nombre: string; descripcion: string }) => ({
      id: dt.id,
      nombre: dt.nombre,
      descripcion: dt.descripcion,
      fases: [], // Se cargarán dinámicamente o usar defaults
      posturas: ['A Favor', 'En Contra'],
      escala_min: dt.id === 'retor' ? 1 : 0,
      escala_max: dt.id === 'retor' ? 5 : 4,
      evaluation_mode: dt.id === 'retor' ? 'per_team' : 'per_speaker',
    }));
  },
};

export default debateTypesService;
