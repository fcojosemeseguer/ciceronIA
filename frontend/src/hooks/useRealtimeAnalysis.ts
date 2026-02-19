/**
 * Hook para análisis en tiempo real de grabaciones de debate
 * Gestiona una cola de análisis que se procesa en paralelo con el debate
 */

import { useCallback, useRef, useEffect } from 'react';
import { analysisService } from '../api/analysis';
import { AudioRecording, AnalysisResult, TeamPosition, RoundType } from '../types';

export interface QueuedAnalysis {
  id: string;
  recording: AudioRecording;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  result?: AnalysisResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface UseRealtimeAnalysisReturn {
  queueAnalysis: (recording: AudioRecording) => void;
  getQueueStatus: () => QueuedAnalysis[];
  getCompletedResults: () => AnalysisResult[];
  isProcessing: boolean;
  pendingCount: number;
  completedCount: number;
  errorCount: number;
}

// Mapear RoundType a fase del backend
const mapRoundTypeToFase = (roundType: RoundType): string => {
  const mapping: Record<RoundType, string> = {
    'Introducción': 'introduccion',
    'Primer Refutador': 'refutacion1',
    'Segundo Refutador': 'refutacion2',
    'Conclusión': 'conclusion',
    'Contextualización': 'contextualizacion',
    'Definición': 'definicion',
    'Valoración': 'valoracion',
  };
  return mapping[roundType] || roundType.toLowerCase();
};

// Mapear TeamPosition a postura
const mapTeamToPostura = (team: TeamPosition): string => {
  return team === 'A' ? 'A Favor' : 'En Contra';
};

export const useRealtimeAnalysis = (
  debateType: string = 'upct',
  onResultReceived?: (result: AnalysisResult, recording: AudioRecording) => void
): UseRealtimeAnalysisReturn => {
  const queueRef = useRef<QueuedAnalysis[]>([]);
  const processingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Procesar la siguiente grabación en la cola
  const processNextInQueue = useCallback(async () => {
    if (processingRef.current || !isMountedRef.current) return;
    
    const pending = queueRef.current.find(q => q.status === 'pending');
    if (!pending) return;

    processingRef.current = true;
    pending.status = 'analyzing';
    pending.startedAt = new Date();

    try {
      if (!pending.recording.blob) {
        throw new Error('No audio blob available');
      }

      // Convertir Blob a File
      const file = new File(
        [pending.recording.blob],
        `debate_${pending.recording.team}_${pending.recording.roundType}.wav`,
        { type: 'audio/wav' }
      );

      // Enviar al backend
      const result = await analysisService.quickAnalyse({
        fase: mapRoundTypeToFase(pending.recording.roundType),
        postura: mapTeamToPostura(pending.recording.team),
        orador: `Orador ${pending.recording.order}`,
        num_speakers: 1,
        debate_type: debateType,
        file: file,
      });

      if (!isMountedRef.current) return;

      pending.status = 'completed';
      pending.result = result;
      pending.completedAt = new Date();

      // Notificar resultado
      if (onResultReceived) {
        onResultReceived(result, pending.recording);
      }

    } catch (error) {
      if (!isMountedRef.current) return;
      
      pending.status = 'error';
      pending.error = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error analyzing recording:', error);
    } finally {
      processingRef.current = false;
      
      // Procesar siguiente en cola
      if (isMountedRef.current) {
        setTimeout(() => processNextInQueue(), 100);
      }
    }
  }, [debateType, onResultReceived]);

  // Añadir grabación a la cola
  const queueAnalysis = useCallback((recording: AudioRecording) => {
    const queuedItem: QueuedAnalysis = {
      id: recording.id,
      recording,
      status: 'pending',
    };

    queueRef.current.push(queuedItem);
    
    // Iniciar procesamiento si no está procesando
    processNextInQueue();
  }, [processNextInQueue]);

  // Obtener estado de la cola
  const getQueueStatus = useCallback(() => {
    return [...queueRef.current];
  }, []);

  // Obtener resultados completados
  const getCompletedResults = useCallback(() => {
    return queueRef.current
      .filter(q => q.status === 'completed' && q.result)
      .map(q => q.result!);
  }, []);

  // Contadores
  const pendingCount = queueRef.current.filter(q => q.status === 'pending').length;
  const completedCount = queueRef.current.filter(q => q.status === 'completed').length;
  const errorCount = queueRef.current.filter(q => q.status === 'error').length;

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    queueAnalysis,
    getQueueStatus,
    getCompletedResults,
    isProcessing: processingRef.current,
    pendingCount,
    completedCount,
    errorCount,
  };
};

export default useRealtimeAnalysis;
