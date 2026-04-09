/**
 * Hook para analisis en tiempo real de grabaciones de debate.
 * Expone una cola reactiva para que la UI refleje bien el estado del backend.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { analysisService } from '../api/analysis';
import { AudioRecording, AnalysisResult, TeamPosition, RoundType, Project } from '../types';

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
  queueAnalysis: (recording: AudioRecording) => Promise<AnalysisResult>;
  getQueueStatus: () => QueuedAnalysis[];
  getCompletedResults: () => AnalysisResult[];
  isProcessing: boolean;
  pendingCount: number;
  completedCount: number;
  errorCount: number;
}

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

const mapTeamToPostura = (team: TeamPosition): string => {
  return team === 'A' ? 'A Favor' : 'En Contra';
};

export const useRealtimeAnalysis = (
  project: Project | null,
  debateType: string = 'upct',
  onResultReceived?: (result: AnalysisResult, recording: AudioRecording) => void
): UseRealtimeAnalysisReturn => {
  const queueRef = useRef<QueuedAnalysis[]>([]);
  const processingRef = useRef(false);
  const isMountedRef = useRef(true);
  const [queueState, setQueueState] = useState<QueuedAnalysis[]>([]);
  const [isProcessingState, setIsProcessingState] = useState(false);

  const syncQueue = useCallback((nextQueue: QueuedAnalysis[]) => {
    queueRef.current = nextQueue;
    if (isMountedRef.current) {
      setQueueState([...nextQueue]);
    }
  }, []);

  const processNextInQueue = useCallback(async () => {
    if (processingRef.current || !isMountedRef.current) {
      return;
    }

    const pending = queueRef.current.find((item) => item.status === 'pending');
    if (!pending) {
      return;
    }

    processingRef.current = true;
    setIsProcessingState(true);
    pending.status = 'analyzing';
    pending.startedAt = new Date();
    syncQueue([...queueRef.current]);

    try {
      if (!pending.recording.blob) {
        throw new Error('No audio blob available');
      }

      const file = new File(
        [pending.recording.blob],
        `debate_${pending.recording.team}_${pending.recording.roundType}.wav`,
        { type: 'audio/wav' }
      );

      const result = project
        ? await analysisService.analyse({
            fase: mapRoundTypeToFase(pending.recording.roundType),
            postura: mapTeamToPostura(pending.recording.team),
            orador: `Orador ${pending.recording.order}`,
            num_speakers: 1,
            project_code: project.code,
            file,
          })
        : await analysisService.quickAnalyse({
            fase: mapRoundTypeToFase(pending.recording.roundType),
            postura: mapTeamToPostura(pending.recording.team),
            orador: `Orador ${pending.recording.order}`,
            num_speakers: 1,
            debate_type: debateType,
            file,
          });

      if (!isMountedRef.current) {
        return;
      }

      pending.status = 'completed';
      pending.result = result;
      pending.completedAt = new Date();
      syncQueue([...queueRef.current]);

      onResultReceived?.(result, pending.recording);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      pending.status = 'error';
      pending.error = error instanceof Error ? error.message : 'Error desconocido';
      syncQueue([...queueRef.current]);
      console.error('Error analyzing recording:', error);
    } finally {
      processingRef.current = false;
      setIsProcessingState(false);

      if (isMountedRef.current) {
        setTimeout(() => {
          void processNextInQueue();
        }, 100);
      }
    }
  }, [project, debateType, onResultReceived, syncQueue]);

  const queueAnalysis = useCallback((recording: AudioRecording): Promise<AnalysisResult> => {
    return new Promise((resolve, reject) => {
      const queuedItem: QueuedAnalysis = {
        id: recording.id,
        recording,
        status: 'pending',
      };

      syncQueue([...queueRef.current, queuedItem]);
      void processNextInQueue();

      const checkInterval = setInterval(() => {
        const item = queueRef.current.find((entry) => entry.id === recording.id);

        if (item?.status === 'completed' && item.result) {
          clearInterval(checkInterval);
          resolve(item.result);
        } else if (item?.status === 'error') {
          clearInterval(checkInterval);
          reject(new Error(item.error || 'Error en el analisis'));
        }
      }, 120);
    });
  }, [processNextInQueue, syncQueue]);

  const getQueueStatus = useCallback(() => {
    return [...queueState];
  }, [queueState]);

  const getCompletedResults = useCallback(() => {
    return queueState
      .filter((item) => item.status === 'completed' && item.result)
      .map((item) => item.result as AnalysisResult);
  }, [queueState]);

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
    isProcessing: isProcessingState,
    pendingCount: queueState.filter((item) => item.status === 'pending').length,
    completedCount: queueState.filter((item) => item.status === 'completed').length,
    errorCount: queueState.filter((item) => item.status === 'error').length,
  };
};

export default useRealtimeAnalysis;
