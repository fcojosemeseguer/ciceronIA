/**
 * Hook para grabación de audio en formato WAV
 * Captura audio del micrófono y lo almacena como Blob WAV
 * Compatible con APIs de procesamiento de audio
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { AudioRecording } from '../types';
import { audioBufferToWav, createBrowserAudioContext } from '../utils/audioProcessing';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<AudioRecording | null>;
  error: string | null;
  clearError: () => void;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const cleanupMediaResources = useCallback(async () => {
    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // Ignorar errores de cierre
      }
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      clearError();

      // Solicitar acceso al micrófono
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          sampleRate: 44100, // Sample rate estándar para WAV
          channelCount: 1,   // Mono para menor tamaño
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();

      // Crear AudioContext
      const audioContext = createBrowserAudioContext();
      audioContextRef.current = audioContext;

      // Crear source node
      const source = audioContext.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Crear processor node para capturar datos
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        // Copiar datos (Float32Array)
        audioChunksRef.current.push(new Float32Array(inputData));
      };

      // Conectar nodos
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al acceder al micrófono';
      setError(message);
      console.error('Error iniciando grabación:', err);
    }
  }, [clearError]);

    const stopRecording = useCallback(async (): Promise<AudioRecording | null> => {
    if (!isRecording || !audioContextRef.current) {
      return null;
    }

    const duration = (Date.now() - recordingStartTimeRef.current) / 1000;

    // Desconectar y detener
    await cleanupMediaResources();

    try {
      // Crear AudioBuffer a partir de los chunks
      const audioContext = createBrowserAudioContext();
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
      
      // Validar que hay datos de audio
      if (totalLength === 0) {
        console.warn('No se capturó audio - buffer vacío');
        setIsRecording(false);
        return null;
      }
      
      const audioBuffer = audioContext.createBuffer(1, totalLength, audioContext.sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      let offset = 0;
      for (const chunk of audioChunksRef.current) {
        channelData.set(chunk, offset);
        offset += chunk.length;
      }

      // Cerrar AudioContext temporal
      await audioContext.close();

      setIsRecording(false);

      // Convertir a WAV
      const wavBlob = audioBufferToWav(audioBuffer);

      // Crear grabación
      const recording: AudioRecording = {
        id: `recording_${Date.now()}`,
        team: 'A',
        roundType: 'Introducción',
        order: 1,
        timestamp: new Date().toISOString(),
        duration,
        blob: wavBlob,
        url: URL.createObjectURL(wavBlob),
      };

      return recording;
    } catch (error) {
      console.error('Error al procesar la grabación:', error);
      
      // Asegurar que el AudioContext se cierre incluso si hay error
      await cleanupMediaResources();
      
      setIsRecording(false);
      return null;
    }
  }, [cleanupMediaResources, isRecording]);

  useEffect(() => {
    return () => {
      cleanupMediaResources();
    };
  }, [cleanupMediaResources]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
};
