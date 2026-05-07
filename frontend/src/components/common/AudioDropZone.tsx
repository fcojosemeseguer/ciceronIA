/**
 * AudioDropZone - Componente para subir audio con drag & drop
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileAudio, X, RefreshCw, Loader2 } from 'lucide-react';
import { AudioUpload } from '../../types';
import { useAudioConverter } from '../../hooks';

interface AudioDropZoneProps {
  upload: AudioUpload | undefined;
  onFileSelected: (file: File, wavBlob: Blob) => void;
  onClear: () => void;
  onRetry: () => void;
  teamAColor?: string;
  teamBColor?: string;
}

export const AudioDropZone: React.FC<AudioDropZoneProps> = ({
  upload,
  onFileSelected,
  onClear,
  onRetry,
  teamAColor = '#FF6B00',
  teamBColor = '#00E5FF',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const { isConverting, progress, error, convertFile, clearError } = useAudioConverter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    clearError();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const wavBlob = await convertFile(file);
      if (wavBlob) {
        onFileSelected(file, wavBlob);
      }
    }
  }, [clearError, convertFile, onFileSelected]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const wavBlob = await convertFile(file);
      if (wavBlob) {
        onFileSelected(file, wavBlob);
      }
    }
  }, [convertFile, onFileSelected]);

  const getPostureTone = () => {
    const postura = upload?.postura?.trim().toLowerCase() || '';
    const isAFavor = postura.includes('favor');

    return isAFavor
      ? {
          border: `${teamAColor}55`,
          bg: `${teamAColor}16`,
          text: teamAColor,
          solid: teamAColor,
        }
      : {
          border: `${teamBColor}55`,
          bg: `${teamBColor}16`,
          text: teamBColor,
          solid: teamBColor,
        };
  };

  const getStatusColor = () => {
    const tone = getPostureTone();

    if (!upload) {
      return isDragging
        ? {
            borderColor: tone.border,
            background: tone.bg,
          }
        : undefined;
    }
    switch (upload.status) {
      case 'completed':
        return {
          borderColor: 'rgba(58, 125, 68, 0.45)',
          background: 'rgba(58, 125, 68, 0.1)',
        };
      case 'error':
        return {
          borderColor: 'rgba(196, 69, 54, 0.45)',
          background: 'rgba(196, 69, 54, 0.12)',
        };
      case 'analyzing':
      case 'uploading':
        return {
          borderColor: tone.border,
          background: tone.bg,
        };
      default:
        return {
          borderColor: tone.border,
          background: tone.bg,
        };
    }
  };

  const getUploadLabel = () => {
    if (!upload) return 'Audio';
    return upload.file?.name || upload.persistedFileName || 'Audio previamente cargado';
  };

  const tone = getPostureTone();

  if (upload?.status === 'completed' && upload.result) {
    return (
      <div className="relative p-3 rounded-xl border border-green-500/30 bg-green-500/10">
        <button
          onClick={onClear}
          className="absolute top-1 right-1 p-1 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-green-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{getUploadLabel()}</p>
            <p className="text-xs text-green-400">
              Analisis completado - {upload.result.total}/{upload.result.max_total} pts
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (upload?.status === 'error' && upload.file) {
    return (
      <div className="relative p-3 rounded-xl border border-red-500/30 bg-red-500/10">
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{getUploadLabel()}</p>
            <p className="text-xs text-red-400 truncate" title={upload.error}>
              {upload.error || 'Error en el analisis'}
            </p>
          </div>
          <button
            onClick={onRetry}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Reintentar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if ((upload?.status === 'analyzing' || upload?.status === 'uploading') && upload.file) {
    return (
      <div
        className="relative rounded-xl border p-3"
        style={{ borderColor: tone.border, background: tone.bg }}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: tone.text }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{getUploadLabel()}</p>
            <p className="text-xs" style={{ color: tone.text }}>
              Analizando... {upload.progress || 0}%
            </p>
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ background: tone.solid, width: `${upload.progress || 0}%` }}
          />
        </div>
      </div>
    );
  }

  if (upload?.file && (upload.status === 'pending' || upload.status === 'converting')) {
    return (
      <div
        className="relative rounded-xl border p-3"
        style={{ borderColor: tone.border, background: tone.bg }}
      >
        <button
          onClick={onClear}
          className="absolute top-1 right-1 p-1 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" style={{ color: tone.text }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{getUploadLabel()}</p>
            <p className="text-xs" style={{ color: tone.text }}>
              {upload.status === 'converting' ? 'Convirtiendo...' : 'Listo para analizar'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusTone = getStatusColor();

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative rounded-xl border-2 border-dashed p-4
        transition-all duration-200 cursor-pointer
        ${isDragging ? 'scale-105' : 'hover:border-white/40'}
      `}
      style={statusTone}
    >
      {upload?.persistedFileName && !upload.file && (
        <div className="mb-3 p-3 rounded-xl border border-white/10 bg-white/5 text-left">
          <p className="text-sm text-white truncate">{upload.persistedFileName}</p>
          <p className="text-xs text-white/50">
            {upload.status === 'analyzing' || upload.status === 'uploading'
              ? 'Este audio quedo a medio analizar. Puedes volver a subirlo o comprobar si ya aparecio como completado.'
              : upload.status === 'error'
                ? 'Este audio necesita una nueva subida para reintentar el analisis.'
                : 'Puedes seguir con el resto o volver a subir este audio cuando quieras.'}
          </p>
        </div>
      )}

      <input
        type="file"
        accept="audio/*,video/*"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={isConverting}
      />

      <div className="flex flex-col items-center gap-2 text-center">
        {isConverting ? (
          <>
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: tone.text }} />
            <p className="text-sm text-white/70">Convirtiendo... {progress}%</p>
          </>
        ) : (
          <>
            <Upload
              className="h-6 w-6"
              style={{ color: isDragging ? tone.text : 'rgba(255, 255, 255, 0.5)' }}
            />
            <div className="text-xs text-white/50">
              <p>Arrastra audio aqui</p>
              <p>o haz clic para seleccionar</p>
            </div>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  );
};

export default AudioDropZone;
