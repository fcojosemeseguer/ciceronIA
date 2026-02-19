/**
 * AudioDropZone - Componente para subir audio con drag & drop
 */

import React, { useState, useCallback } from 'react';
import { Upload, FileAudio, X, RefreshCw, Loader2 } from 'lucide-react';
import { AudioUpload } from '../../types';
import { useAudioConverter } from '../../hooks';
import { formatFileSize } from '../../utils/audioConverter';

interface AudioDropZoneProps {
  upload: AudioUpload | undefined;
  onFileSelected: (file: File, wavBlob: Blob) => void;
  onClear: () => void;
  onRetry: () => void;
}

export const AudioDropZone: React.FC<AudioDropZoneProps> = ({
  upload,
  onFileSelected,
  onClear,
  onRetry,
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
  }, [convertFile, onFileSelected, clearError]);

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

  const getStatusColor = () => {
    if (!upload) return isDragging ? 'border-[#00E5FF] bg-[#00E5FF]/10' : 'border-white/20 bg-white/5';
    switch (upload.status) {
      case 'completed':
        return 'border-green-500/50 bg-green-500/10';
      case 'error':
        return 'border-red-500/50 bg-red-500/10';
      case 'analyzing':
      case 'uploading':
        return 'border-[#FF6B00]/50 bg-[#FF6B00]/10';
      default:
        return 'border-white/20 bg-white/5';
    }
  };

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
            <p className="text-sm text-white truncate">{upload.file?.name}</p>
            <p className="text-xs text-green-400">
              ✓ Análisis completado - {upload.result.total}/{upload.result.max_total} pts
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (upload?.status === 'error') {
    return (
      <div className="relative p-3 rounded-xl border border-red-500/30 bg-red-500/10">
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{upload.file?.name}</p>
            <p className="text-xs text-red-400 truncate" title={upload.error}>
              ✗ {upload.error || 'Error en el análisis'}
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

  if (upload?.status === 'analyzing' || upload?.status === 'uploading') {
    return (
      <div className="relative p-3 rounded-xl border border-[#FF6B00]/30 bg-[#FF6B00]/10">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-[#FF6B00] animate-spin" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{upload.file?.name}</p>
            <p className="text-xs text-[#FF6B00]">
              Analizando... {upload.progress || 0}%
            </p>
          </div>
        </div>
        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#FF6B00] transition-all duration-300"
            style={{ width: `${upload.progress || 0}%` }}
          />
        </div>
      </div>
    );
  }

  // Archivo subido pero pendiente de análisis
  if (upload?.file && (upload.status === 'pending' || upload.status === 'converting')) {
    return (
      <div className="relative p-3 rounded-xl border border-[#00E5FF]/30 bg-[#00E5FF]/10">
        <button
          onClick={onClear}
          className="absolute top-1 right-1 p-1 text-white/50 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <FileAudio className="w-5 h-5 text-[#00E5FF]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{upload.file.name}</p>
            <p className="text-xs text-[#00E5FF]">
              {upload.status === 'converting' ? 'Convirtiendo...' : 'Listo para analizar'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative p-4 rounded-xl border-2 border-dashed 
        transition-all duration-200 cursor-pointer
        ${getStatusColor()}
        ${isDragging ? 'scale-105' : 'hover:border-white/40'}
      `}
    >
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
            <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
            <p className="text-sm text-white/70">Convirtiendo... {progress}%</p>
          </>
        ) : (
          <>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-[#00E5FF]' : 'text-white/50'}`} />
            <div className="text-xs text-white/50">
              <p>Arrastra audio aquí</p>
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
