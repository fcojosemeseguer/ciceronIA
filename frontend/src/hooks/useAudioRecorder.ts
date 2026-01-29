/**
 * Hook para grabación de audio
 * Captura audio del micrófono y lo almacena como Blob
 */

import { useRef, useCallback, useState } from 'react';
import { AudioRecording } from '../types';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecording | null>;
  error: string | null;
  clearError: () => void;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const startRecording = useCallback(async () => {
    try {
      clearError();

      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Crear MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al acceder al micrófono';
      setError(message);
      console.error('Error iniciando grabación:', err);
    }
  }, [clearError]);

  const stopRecording = useCallback(async (): Promise<AudioRecording | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      const mediaRecorder = mediaRecorderRef.current;

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = (Date.now() - recordingStartTimeRef.current) / 1000;

        // Detener stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);

        // Retornar grabación (sin team/roundType/order - se asignarán después)
        const recording: AudioRecording = {
          id: `recording_${Date.now()}`,
          team: 'A',
          roundType: 'Introducción',
          order: 1,
          timestamp: new Date().toISOString(),
          duration,
          blob,
          url: URL.createObjectURL(blob),
        };

        resolve(recording);
      };

      mediaRecorder.stop();
    });
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
};
