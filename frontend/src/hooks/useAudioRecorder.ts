/**
 * Hook para grabación de audio en formato WAV
 * Captura audio del micrófono y lo almacena como Blob WAV
 * Compatible con APIs de procesamiento de audio
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

// Función para convertir AudioBuffer a WAV
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  
  const dataLength = buffer.length * numberOfChannels * bytesPerSample;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // Escribir encabezado WAV
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Escribir datos de audio
  const offset = 44;
  const channels: Float32Array[] = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let index = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset + index, intSample, true);
      index += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 44100,
      });
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

    try {
      // Crear AudioBuffer a partir de los chunks
      const audioContext = audioContextRef.current;
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

      // Cerrar AudioContext
      await audioContext.close();
      audioContextRef.current = null;

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
      if (audioContextRef.current) {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          // Ignorar error al cerrar
        }
        audioContextRef.current = null;
      }
      
      setIsRecording(false);
      return null;
    }
  }, [isRecording]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
};
