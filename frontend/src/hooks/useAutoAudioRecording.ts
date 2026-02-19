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
  const isStoppingRef = useRef(false);
  const currentRoundRef = useRef(getCurrentRound());
  const lastRoundIdRef = useRef<string>('');

  useEffect(() => {
    currentRoundRef.current = getCurrentRound();
  }, [getCurrentRound]);

  // Generar ID único para la ronda actual
  const getCurrentRoundId = () => {
    const round = getCurrentRound();
    return round ? `${round.team}-${round.roundType}-${round.order}` : '';
  };

  // Iniciar grabación cuando comienza un turno
  useEffect(() => {
    // No iniciar si estamos deteniendo una grabación
    if (isStoppingRef.current) return;
    
    // No iniciar si ya hay una grabación en progreso
    if (isRecording || recordingStartedRef.current) return;
    
    // Solo iniciar si el debate está corriendo y el timer está activo
    if (debateState !== 'running' || !isTimerRunning) return;

    const currentRoundId = getCurrentRoundId();
    
    // Evitar iniciar grabación duplicada para la misma ronda
    if (currentRoundId === lastRoundIdRef.current) return;

    startRecording();
    recordingStartedRef.current = true;
    lastRoundIdRef.current = currentRoundId;
  }, [debateState, isTimerRunning, isRecording, startRecording, getCurrentRound]);

  // Detener grabación cuando:
  // 1. El tiempo llega a 0
  // 2. Se pausa el debate
  // 3. Se cambia de turno
  useEffect(() => {
    // Solo detener si estamos grabando y no estamos ya deteniendo
    if (!isRecording || !recordingStartedRef.current || isStoppingRef.current) return;

    // Condiciones para detener: tiempo en 0, pausado, o timer detenido
    const shouldStop = timeRemaining === 0 || debateState === 'paused' || !isTimerRunning;
    
    if (!shouldStop) return;

    // Marcar que estamos deteniendo para evitar condiciones de carrera
    isStoppingRef.current = true;

    stopRecording().then((recording) => {
      if (recording && currentRoundRef.current) {
        // Validar duración mínima (evitar grabaciones de 0 segundos)
        if (recording.duration < 1) {
          console.warn('Grabación demasiado corta, descartando:', recording.duration);
          isStoppingRef.current = false;
          recordingStartedRef.current = false;
          return;
        }

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
      
      // Resetear flags después de un pequeño delay para evitar iniciar inmediatamente
      setTimeout(() => {
        isStoppingRef.current = false;
        recordingStartedRef.current = false;
      }, 500);
    });
  }, [timeRemaining, debateState, isTimerRunning, isRecording, stopRecording, addRecording, addToAnalysisQueue, props?.onRecordingComplete]);

  return {
    isRecording,
    audioError: error,
  };
};

