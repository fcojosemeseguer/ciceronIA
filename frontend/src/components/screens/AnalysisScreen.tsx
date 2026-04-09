/**
 * AnalysisScreen - Pantalla de análisis de audios con grid de fases
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Play, BarChart3, Loader2, Users } from 'lucide-react';
import { debatesService } from '../../api';
import { useProjectStore, useAnalysisStore } from '../../store';
import { AudioUpload, Project, DebateType, Debate, AnalysisResult } from '../../types';
import { LiquidGlassButton, AudioDropZone } from '../common';
import { clearAnalysisDraft, loadAnalysisDraft, saveAnalysisDraft } from '../../utils/debatePersistence';
import { normalizePhaseName } from '../../utils/roundsSequence';

interface AnalysisScreenProps {
  project?: Project;
  debate?: Debate;
  onBack: () => void;
  onViewResults: () => void;
}

const createUploadId = (debateCode: string, faseId: string, postura: string) =>
  `${debateCode}:${faseId}:${postura}`.toLowerCase().replace(/\s+/g, '-');

const getSlotKey = (faseNombre: string, postura: string) =>
  `${normalizePhaseName(faseNombre)}::${postura.trim().toLowerCase()}`;

const getPostureCardTone = (postura: string) => {
  const normalized = postura.trim().toLowerCase();
  return normalized.includes('favor')
    ? {
        border: 'border-[#FF6B00]/20',
        bg: 'bg-[#FF6B00]/[0.06]',
        label: 'text-[#FF6B00]',
      }
    : {
        border: 'border-[#00E5FF]/20',
        bg: 'bg-[#00E5FF]/[0.06]',
        label: 'text-[#00E5FF]',
      };
};

const buildUploadsFromProgress = (
  debateTypeDefinition: DebateType,
  debateCode: string,
  completedAnalyses: AnalysisResult[],
  draftUploads: AudioUpload[]
): AudioUpload[] => {
  const completedBySlot = new Map(
    completedAnalyses.map((analysis) => [getSlotKey(analysis.fase, analysis.postura), analysis])
  );
  const draftBySlot = new Map(
    draftUploads.map((upload) => [getSlotKey(upload.faseNombre, upload.postura), upload])
  );

  return debateTypeDefinition.fases.flatMap((fase) =>
    debateTypeDefinition.posturas.map((postura) => {
      const slotKey = getSlotKey(fase.nombre, postura);
      const completedAnalysis = completedBySlot.get(slotKey);
      const draftUpload = draftBySlot.get(slotKey);

      if (completedAnalysis) {
        return {
          id: createUploadId(debateCode, fase.id, postura),
          faseId: fase.id,
          faseNombre: fase.nombre,
          postura,
          numOradores: draftUpload?.numOradores || 1,
          file: null,
          persistedFileName: draftUpload?.persistedFileName || 'Audio analizado previamente',
          status: 'completed',
          result: completedAnalysis,
          minutoOroUtilizado: draftUpload?.minutoOroUtilizado,
          preguntasRealizadas: draftUpload?.preguntasRealizadas,
          preguntasRespondidas: draftUpload?.preguntasRespondidas,
          primerMinutoProtegido: draftUpload?.primerMinutoProtegido,
        };
      }

      return {
        id: createUploadId(debateCode, fase.id, postura),
        faseId: fase.id,
        faseNombre: fase.nombre,
        postura,
        numOradores: draftUpload?.numOradores || 1,
        file: null,
        persistedFileName: draftUpload?.persistedFileName,
        status: draftUpload?.status === 'completed' ? 'pending' : draftUpload?.status || 'pending',
        error: draftUpload?.error,
        minutoOroUtilizado: draftUpload?.minutoOroUtilizado,
        preguntasRealizadas: draftUpload?.preguntasRealizadas,
        preguntasRespondidas: draftUpload?.preguntasRespondidas,
        primerMinutoProtegido: draftUpload?.primerMinutoProtegido,
      };
    })
  );
};

export const AnalysisScreen: React.FC<AnalysisScreenProps> = ({
  project,
  debate,
  onBack,
  onViewResults,
}) => {
  const { debateTypes, selectedDebateType, selectDebateType, fetchDebateTypes } = useProjectStore();
  const {
    uploads,
    isAnalyzing,
    globalProgress,
    replaceUploads,
    updateUploadStatus,
    analyseAudio,
    analyseAll,
    getCompletedCount,
    getTotalCount,
  } = useAnalysisStore();

  const [numOradores, setNumOradores] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const debateData = debate || project;
  const debateCode = debate?.code || project?.code || '';
  const debateType = debate?.debate_type || project?.debate_type || 'upct';

  useEffect(() => {
    if (debateTypes.length === 0) {
      fetchDebateTypes();
    }
  }, [debateTypes.length, fetchDebateTypes]);

  useEffect(() => {
    if (debateType) {
      selectDebateType(debateType);
    } else if (debateTypes.length > 0 && !selectedDebateType) {
      selectDebateType(debateTypes[0].id);
    }
  }, [debateType, debateTypes, selectedDebateType, selectDebateType]);

  useEffect(() => {
    if (!debateCode || !selectedDebateType) return;

    let cancelled = false;

    const hydrateUploads = async () => {
      const draftUploads = loadAnalysisDraft(debateCode) as AudioUpload[];
      let analyses: AnalysisResult[] = [];

      try {
        const response = await debatesService.getDebate(debateCode);
        analyses = response.analyses || [];
      } catch (error) {
        console.error('No se pudo reconstruir el progreso del análisis', error);
      }

      if (cancelled) return;

      const hydratedUploads = buildUploadsFromProgress(
        selectedDebateType,
        debateCode,
        analyses,
        draftUploads
      );

      replaceUploads(hydratedUploads);

      const restoredSpeakerCount = hydratedUploads.find((upload) => upload.numOradores > 1)?.numOradores;
      if (restoredSpeakerCount) {
        setNumOradores(restoredSpeakerCount);
      }
    };

    hydrateUploads();

    return () => {
      cancelled = true;
    };
  }, [debateCode, replaceUploads, selectedDebateType]);

  useEffect(() => {
    if (!debateCode || uploads.length === 0) return;

    saveAnalysisDraft(debateCode, uploads);

    if (uploads.every((upload) => upload.status === 'completed')) {
      clearAnalysisDraft(debateCode);
    }
  }, [debateCode, uploads]);

  const handleFileSelected = (uploadId: string, file: File, wavBlob: Blob) => {
    updateUploadStatus(uploadId, 'pending', {
      file,
      wavBlob,
      persistedFileName: file.name,
      numOradores,
      error: undefined,
    });
  };

  const handleMinutoOroChange = (uploadId: string, value: boolean) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;

    updateUploadStatus(uploadId, upload.status, {
      minutoOroUtilizado: value,
    });
  };

  const handlePreguntasChange = (
    uploadId: string,
    field: 'preguntasRealizadas' | 'preguntasRespondidas',
    value: number
  ) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;

    updateUploadStatus(uploadId, upload.status, {
      [field]: value,
    });
  };

  const handleNumOradoresChange = (uploadId: string, value: number) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;

    updateUploadStatus(uploadId, upload.status, {
      numOradores: value,
    });
  };

  const handleClearUpload = (uploadId: string) => {
    updateUploadStatus(uploadId, 'pending', {
      file: null,
      persistedFileName: undefined,
      wavBlob: undefined,
      result: undefined,
      error: undefined,
    });
  };

  const handleRetryUpload = (uploadId: string) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (upload && debateData) {
      analyseAudio(uploadId, debateData as Project, selectedDebateType);
    }
  };

  const handleAnalyseAll = () => {
    if (debateData) {
      analyseAll(debateData as Project, selectedDebateType);
    }
  };

  const uploadsByFase = useMemo(() => (
    selectedDebateType?.fases.map((fase) => ({
      fase,
      uploads: uploads.filter((u) => u.faseId === fase.id),
    })) || []
  ), [selectedDebateType, uploads]);

  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const hasPendingUploads = uploads.some((u) => u.file && u.status === 'pending');
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  if (!debateData) {
    return (
    <div className="app-shell flex items-center justify-center">
        <div className="text-white/60">Error: No se proporcionó debate ni proyecto</div>
      </div>
    );
  }

  if (!selectedDebateType) {
    return (
    <div className="app-shell flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="app-shell overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {debate?.debate_topic || debate?.name || project?.debate_topic || project?.name || 'Análisis de Debate'}
                </h1>
                <p className="text-white/50">
                  {(debate?.team_a_name || project?.team_a_name || 'Equipo A')} vs {(debate?.team_b_name || project?.team_b_name || 'Equipo B')} · {selectedDebateType.nombre}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                      className={`p-4 rounded-xl backdrop-blur-xl border ${getPostureCardTone(upload.postura).bg} ${getPostureCardTone(upload.postura).border}`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className={`text-sm font-medium ${getPostureCardTone(upload.postura).label}`}>
                          {upload.postura}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/40">Nº oradores:</span>
                          <input
                            type="number"
                            min={1}
                            max={10}
                            value={upload.numOradores}
                            onChange={(e) => handleNumOradoresChange(upload.id, parseInt(e.target.value, 10) || 1)}
                            className="w-12 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-xs text-center"
                          />
                        </div>
                      </div>

                      <div className="mb-4 space-y-3">
                        {fase.permite_minuto_oro && (
                          <button
                            onClick={() => handleMinutoOroChange(upload.id, !upload.minutoOroUtilizado)}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                              upload.minutoOroUtilizado
                                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                upload.minutoOroUtilizado
                                  ? 'bg-yellow-500 text-slate-900'
                                  : 'bg-white/10 text-white/40'
                              }`}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <span className="text-sm font-medium">
                                {upload.minutoOroUtilizado ? 'Minuto de oro activado' : 'Usar minuto de oro'}
                              </span>
                            </div>
                            {upload.minutoOroUtilizado && (
                              <span className="text-xs bg-yellow-500/30 px-2 py-1 rounded-full">
                                +1 min
                              </span>
                            )}
                          </button>
                        )}

                        {fase.permite_preguntas && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/70 w-32">Preguntas hechas:</span>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={upload.preguntasRealizadas || 0}
                                onChange={(e) => handlePreguntasChange(upload.id, 'preguntasRealizadas', parseInt(e.target.value, 10) || 0)}
                                className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm text-center"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-white/70 w-32">Respondidas:</span>
                              <input
                                type="number"
                                min={0}
                                max={upload.preguntasRealizadas || 0}
                                value={upload.preguntasRespondidas || 0}
                                onChange={(e) => handlePreguntasChange(upload.id, 'preguntasRespondidas', parseInt(e.target.value, 10) || 0)}
                                className="w-16 px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm text-center"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <AudioDropZone
                        upload={upload}
                        onFileSelected={(file, wavBlob) => handleFileSelected(upload.id, file, wavBlob)}
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
                  onChange={(e) => setNumOradores(parseInt(e.target.value, 10) || 1)}
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
