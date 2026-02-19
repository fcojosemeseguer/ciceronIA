/**
 * Hook compuesto para manejar grabación automática durante rondas
 * Ahora integra análisis en tiempo real
 */

import { useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useDebateStore } from '../store/debateStore';
import { AudioRecording } from '../types';

interface UseAutoAudioRecordingProps {
  onRecordingComplete?: (recording: AudioRecording) => void;
}

interface UseAutoAudioRecordingReturn {
  isRecording: boolean;
  audioError: string | null;
}

export const useAutoAudioRecording = (props?: UseAutoAudioRecordingProps): UseAutoAudioRecordingReturn => {
  const { isRecording, startRecording, stopRecording, error } = useAudioRecorder();
  const {
    state: debateState,
    isTimerRunning,
    timeRemaining,
    getCurrentRound,
    addRecording,
    addToAnalysisQueue,
  } = useDebateStore();

  const recordingStartedRef = useRef(false);
  const currentRoundRef = useRef(getCurrentRound());

  useEffect(() => {
    currentRoundRef.current = getCurrentRound();
  }, [getCurrentRound]);

  // Iniciar grabación cuando comienza un turno
  useEffect(() => {
    if (debateState === 'running' && isTimerRunning && !isRecording && !recordingStartedRef.current) {
      startRecording();
      recordingStartedRef.current = true;
    }
  }, [debateState, isTimerRunning, isRecording, startRecording]);

  // Detener grabación cuando:
  // 1. El tiempo llega a 0
  // 2. Se pausa el debate
  // 3. Se cambia de turno
  useEffect(() => {
    if (
      isRecording &&
      recordingStartedRef.current &&
      (timeRemaining === 0 || debateState === 'paused' || !isTimerRunning)
    ) {
      stopRecording().then((recording) => {
        if (recording && currentRoundRef.current) {
          // Actualizar información de la grabación
          recording.team = currentRoundRef.current.team;
          recording.roundType = currentRoundRef.current.roundType;
          recording.order = currentRoundRef.current.order;

          // Guardar en el store
          addRecording(recording);
          
          // Añadir a cola de análisis
          addToAnalysisQueue(recording.id);
          
          // Notificar que la grabación está lista para análisis
          if (props?.onRecordingComplete) {
            props.onRecordingComplete(recording);
          }
        }
        recordingStartedRef.current = false;
      });
    }
  }, [timeRemaining, debateState, isTimerRunning, isRecording, stopRecording, addRecording, addToAnalysisQueue, props?.onRecordingComplete]);

  return {
    isRecording,
    audioError: error,
  };
};

