/**
 * Hook para convertir archivos de audio a WAV
 */

import { useState, useCallback } from 'react';
import { convertToWAV, isAudioFile, formatFileSize } from '../utils/audioConverter';

interface UseAudioConverterReturn {
  isConverting: boolean;
  progress: number;
  error: string | null;
  convertFile: (file: File) => Promise<Blob | null>;
  clearError: () => void;
}

export const useAudioConverter = (): UseAudioConverterReturn => {
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const convertFile = useCallback(async (file: File): Promise<Blob | null> => {
    // Validar archivo
    if (!isAudioFile(file)) {
      setError('Formato de archivo no soportado. Use MP3, M4A, AAC, OGG, FLAC, WEBM o MP4');
      return null;
    }

    // Validar tamaño (máximo 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. Máximo: ${formatFileSize(maxSize)}`);
      return null;
    }

    setIsConverting(true);
    setProgress(0);
    setError(null);

    try {
      // Si ya es WAV, no convertir
      if (file.type === 'audio/wav' || file.name.toLowerCase().endsWith('.wav')) {
        setProgress(100);
        setIsConverting(false);
        return file;
      }

      // Simular progreso (la API no tiene callback de progreso real)
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 200);

      const wavBlob = await convertToWAV(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      setIsConverting(false);
      
      return wavBlob;
    } catch (err: any) {
      setError(err.message || 'Error al convertir el archivo');
      setIsConverting(false);
      setProgress(0);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isConverting,
    progress,
    error,
    convertFile,
    clearError,
  };
};

export default useAudioConverter;
