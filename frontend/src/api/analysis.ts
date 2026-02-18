/**
 * Analysis Service - Análisis de audio de debates
 */

import apiClient from './client';
import { AnalysisResult } from '../types';

interface AnalyseRequest {
  fase: string;
  postura: string;
  orador: string;
  num_speakers: number;
  project_code: string;
  jwt: string;
  file: File;
}

interface QuickAnalyseRequest {
  fase: string;
  postura: string;
  orador: string;
  num_speakers: number;
  debate_type: string;
  file: File;
}

export const analysisService = {
  /**
   * Analizar audio con proyecto asociado
   */
  async analyse(data: AnalyseRequest): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('fase', data.fase);
    formData.append('postura', data.postura);
    formData.append('orador', data.orador);
    formData.append('num_speakers', data.num_speakers.toString());
    formData.append('jwt', data.jwt);
    formData.append('project_code', data.project_code);
    formData.append('file', data.file);

    const response = await apiClient.post<AnalysisResult>('/analyse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutos para análisis
    });
    return response.data;
  },

  /**
   * Análisis rápido sin proyecto
   */
  async quickAnalyse(data: QuickAnalyseRequest): Promise<AnalysisResult> {
    const formData = new FormData();
    formData.append('fase', data.fase);
    formData.append('postura', data.postura);
    formData.append('orador', data.orador);
    formData.append('num_speakers', data.num_speakers.toString());
    formData.append('debate_type', data.debate_type);
    formData.append('file', data.file);

    const response = await apiClient.post<AnalysisResult>('/quick-analyse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000, // 2 minutos para análisis
    });
    return response.data;
  },
};

export default analysisService;
