/**
 * AnalysisScreen - Pantalla de análisis de audios con grid de fases
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Play, BarChart3, Loader2, Users } from 'lucide-react';
import { useProjectStore, useAnalysisStore } from '../../store';
import { AudioUpload, Project, DebateType } from '../../types';
import { LiquidGlassButton, AudioDropZone } from '../common';
import { generateId } from '../../utils/audioConverter';

interface AnalysisScreenProps {
  project: Project | null; // null para análisis rápido
  onBack: () => void;
  onViewResults: () => void;
}

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  project,
  onBack,
  onViewResults,
}) => {
  const { debateTypes, selectedDebateType, selectDebateType } = useProjectStore();
  const {
    uploads,
    isAnalyzing,
    globalProgress,
    addUpload,
    removeUpload,
    updateUploadStatus,
    analyseAudio,
    analyseAll,
    clearUploads,
    getCompletedCount,
    getTotalCount,
  } = useAnalysisStore();

  const [numOradores, setNumOradores] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Seleccionar tipo de debate
  useEffect(() => {
    if (project) {
      selectDebateType(project.debate_type);
    } else if (debateTypes.length > 0 && !selectedDebateType) {
      selectDebateType(debateTypes[0].id);
    }
  }, [project, debateTypes, selectedDebateType, selectDebateType]);

  // Generar uploads iniciales basados en el tipo de debate
  useEffect(() => {
    if (selectedDebateType && uploads.length === 0) {
      const initialUploads: AudioUpload[] = [];
      let oradorIndex = 1;

      selectedDebateType.fases.forEach((fase) => {
        selectedDebateType.posturas.forEach((postura) => {
          initialUploads.push({
            id: generateId(),
            faseId: fase.id,
            faseNombre: fase.nombre,
            postura,
            orador: `Orador ${oradorIndex}`,
            numOradores: 1,
            file: null,
            status: 'pending',
          });
          oradorIndex++;
        });
      });

      initialUploads.forEach((upload) => addUpload(upload));
    }
  }, [selectedDebateType, uploads.length, addUpload]);

  const handleFileSelected = (uploadId: string, file: File, wavBlob: Blob) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload) {
      updateUploadStatus(uploadId, 'pending', {
        file,
        wavBlob,
        numOradores,
      });
    }
  };

  const handleClearUpload = (uploadId: string) => {
    updateUploadStatus(uploadId, 'pending', {
      file: null,
      wavBlob: undefined,
      result: undefined,
      error: undefined,
    });
  };

  const handleRetryUpload = (uploadId: string) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload) {
      analyseAudio(uploadId, project, selectedDebateType);
    }
  };

  const handleAnalyseAll = () => {
    analyseAll(project, selectedDebateType);
  };

  const handleChangeDebateType = (typeId: string) => {
    selectDebateType(typeId);
    clearUploads();
  };

  // Agrupar uploads por fase
  const uploadsByFase = selectedDebateType?.fases.map((fase) => ({
    fase,
    uploads: uploads.filter((u) => u.faseId === fase.id),
  })) || [];

  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const hasPendingUploads = uploads.some((u) => u.file && u.status === 'pending');
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  if (!selectedDebateType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  clearUploads();
                  onBack();
                }}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {project ? project.name : 'Análisis Rápido'}
                </h1>
                <p className="text-white/50">
                  {selectedDebateType.nombre}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de tipo de debate (solo para análisis rápido) */}
              {!project && (
                <select
                  value={selectedDebateType.id}
                  onChange={(e) => handleChangeDebateType(e.target.value)}
                  className="
                    px-4 py-2
                    bg-white/5 border border-white/10
                    rounded-xl text-white text-sm
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                    appearance-none cursor-pointer
                  "
                >
                  {debateTypes.map((dt) => (
                    <option key={dt.id} value={dt.id} className="bg-slate-900">
                      {dt.nombre}
                    </option>
                  ))}
                </select>
              )}

              {/* Configuración de oradores */}
              <button
                onClick={() => setShowConfigModal(true)}
                className="
                  flex items-center gap-2 px-4 py-2
                  bg-white/5 border border-white/10
                  rounded-xl text-white/70 text-sm
                  hover:bg-white/10 transition-colors
                "
              >
                <Users className="w-4 h-4" />
                <span>{numOradores} orador{numOradores > 1 ? 'es' : ''}</span>
              </button>

              {/* Progreso global */}
              {totalCount > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                  <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00E5FF] transition-all duration-300"
                      style={{ width: `${globalProgress}%` }}
                    />
                  </div>
                  <span className="text-sm text-white/70">
                    {completedCount}/{totalCount}
                  </span>
                </div>
              )}

              {/* Botones de acción */}
              {allCompleted ? (
                <LiquidGlassButton
                  onClick={onViewResults}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Ver Resultados
                </LiquidGlassButton>
              ) : (
                <LiquidGlassButton
                  onClick={handleAnalyseAll}
                  variant="primary"
                  disabled={!hasPendingUploads || isAnalyzing}
                  className="flex items-center gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Analizar Todo
                    </>
                  )}
                </LiquidGlassButton>
              )}
            </div>
          </div>

          {/* Grid de fases */}
          <div className="space-y-6">
            {uploadsByFase.map(({ fase, uploads: faseUploads }) => (
              <div
                key={fase.id}
                className="
                  p-4 sm:p-6 rounded-2xl
                  backdrop-blur-xl bg-white/5
                  border border-white/10
                "
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 flex items-center justify-center">
                    <span className="text-[#00E5FF] font-bold">
                      {fase.nombre.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{fase.nombre}</h3>
                    <p className="text-sm text-white/50">{fase.descripcion}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faseUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="
                        p-4 rounded-xl
                        backdrop-blur-xl bg-white/5
                        border border-white/10
                      "
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-white">
                          {upload.postura}
                        </span>
                        <span className="text-xs text-white/40">
                          {upload.orador}
                        </span>
                      </div>

                      <AudioDropZone
                        upload={upload}
                        onFileSelected={(file, wavBlob) =>
                          handleFileSelected(upload.id, file, wavBlob)
                        }
                        onClear={() => handleClearUpload(upload.id)}
                        onRetry={() => handleRetryUpload(upload.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfigModal(false)}
          />
          <div className="
            relative w-full max-w-sm
            backdrop-blur-2xl bg-black/40
            border border-white/10
            rounded-3xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            p-6
          ">
            <h3 className="text-xl font-bold text-white mb-6">Configuración</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Número de oradores por equipo
                </label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={numOradores}
                  onChange={(e) => setNumOradores(parseInt(e.target.value) || 1)}
                  className="
                    w-full px-4 py-3
                    bg-white/5 border border-white/10
                    rounded-xl text-white
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                  "
                />
                <p className="mt-2 text-xs text-white/40">
                  Este número se usará para la diarización de cada audio
                </p>
              </div>

              <LiquidGlassButton
                onClick={() => setShowConfigModal(false)}
                variant="primary"
                className="w-full"
              >
                Guardar
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisScreen;
