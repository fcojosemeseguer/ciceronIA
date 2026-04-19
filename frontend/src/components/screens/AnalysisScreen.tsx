/**
 * AnalysisScreen - Analisis de audios con vista carrusel y dashboard.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Play, BarChart3, Loader2, Users } from 'lucide-react';
import { debatesService } from '../../api';
import { useProjectStore, useAnalysisStore } from '../../store';
import { AudioUpload, Project, DebateType, Debate, AnalysisResult } from '../../types';
import { BrandHeader, LiquidGlassButton, AudioDropZone } from '../common';
import { clearAnalysisDraft, loadAnalysisDraft, saveAnalysisDraft } from '../../utils/debatePersistence';
import { loadDebateTeamColors } from '../../utils/debateColors';
import { normalizePhaseName } from '../../utils/roundsSequence';
import checkIcon from '../../assets/icons/icon-check.svg';
import loaderIcon from '../../assets/icons/icon-loader-lines-alt.svg';

interface AnalysisScreenProps {
  project?: Project;
  debate?: Debate;
  onBack: () => void;
  onViewResults: () => void;
  dashboardView?: boolean;
  onDashboardViewChange?: (value: boolean) => void;
}

const createUploadId = (debateCode: string, faseId: string, postura: string) =>
  `${debateCode}:${faseId}:${postura}`.toLowerCase().replace(/\s+/g, '-');

const getSlotKey = (faseNombre: string, postura: string) =>
  `${normalizePhaseName(faseNombre)}::${postura.trim().toLowerCase()}`;

const getPostureCardTone = (postura: string, teamAColor: string, teamBColor: string) => {
  const normalized = postura.trim().toLowerCase();
  return normalized.includes('favor')
    ? { borderColor: `${teamAColor}40`, background: teamAColor }
    : { borderColor: `${teamBColor}40`, background: teamBColor };
};

const buildUploadsFromProgress = (
  debateTypeDefinition: DebateType,
  debateCode: string,
  completedAnalyses: AnalysisResult[],
  draftUploads: AudioUpload[],
  fallbackPosturas: string[]
): AudioUpload[] => {
  const posturas =
    debateTypeDefinition.posturas && debateTypeDefinition.posturas.length > 0
      ? debateTypeDefinition.posturas
      : fallbackPosturas;

  const completedBySlot = new Map(
    completedAnalyses.map((analysis) => [getSlotKey(analysis.fase, analysis.postura), analysis])
  );
  const draftBySlot = new Map(
    draftUploads.map((upload) => [getSlotKey(upload.faseNombre, upload.postura), upload])
  );

  return debateTypeDefinition.fases.flatMap((fase) =>
    posturas.map((postura) => {
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
          status: 'completed' as const,
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
  dashboardView,
  onDashboardViewChange,
}) => {
  const { debateTypes, selectedDebateType, selectDebateType, fetchDebateTypes } = useProjectStore();
  const {
    uploads,
    isAnalyzing,
    replaceUploads,
    updateUploadStatus,
    analyseAudio,
    analyseAll,
    getCompletedCount,
    getTotalCount,
  } = useAnalysisStore();

  const [numOradores, setNumOradores] = useState(1);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [localDashboardView, setLocalDashboardView] = useState(false);
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string | null>(null);
  const [selectedCriterionIndex, setSelectedCriterionIndex] = useState(0);
  const isDashboardView = dashboardView ?? localDashboardView;
  const setDashboardView = onDashboardViewChange ?? setLocalDashboardView;

  const debateData = debate || project;
  const debateCode = debate?.code || project?.code || '';
  const debateType = debate?.debate_type || project?.debate_type || 'upct';
  const persistedColors = useMemo(() => {
    if (!debateCode) return null;
    return loadDebateTeamColors(debateCode);
  }, [debateCode]);
  const teamAColor = debate?.team_a_color || persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = debate?.team_b_color || persistedColors?.team_b_color || '#C44536';
  const fallbackPosturas = [debateData?.team_a_name || 'A favor', debateData?.team_b_name || 'En contra'];

  useEffect(() => {
    if (debateTypes.length === 0) fetchDebateTypes();
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
        console.error('No se pudo reconstruir el progreso del analisis', error);
      }

      if (cancelled) return;

      const hydratedUploads = buildUploadsFromProgress(
        selectedDebateType,
        debateCode,
        analyses,
        draftUploads,
        fallbackPosturas
      );
      replaceUploads(hydratedUploads);
      const restoredSpeakerCount = hydratedUploads.find((upload) => upload.numOradores > 1)?.numOradores;
      if (restoredSpeakerCount) setNumOradores(restoredSpeakerCount);
    };

    hydrateUploads();
    return () => {
      cancelled = true;
    };
  }, [debateCode, replaceUploads, selectedDebateType, fallbackPosturas[0], fallbackPosturas[1]]);

  useEffect(() => {
    if (!debateCode || uploads.length === 0) return;
    const hasActivity = uploads.some(
      (upload) =>
        !!upload.file ||
        !!upload.persistedFileName ||
        !!upload.result ||
        upload.status !== 'pending'
    );
    if (!hasActivity) {
      clearAnalysisDraft(debateCode);
      return;
    }
    saveAnalysisDraft(debateCode, uploads);
    if (uploads.every((upload) => upload.status === 'completed')) clearAnalysisDraft(debateCode);
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
    updateUploadStatus(uploadId, upload.status, { minutoOroUtilizado: value });
  };

  const handlePreguntasChange = (
    uploadId: string,
    field: 'preguntasRealizadas' | 'preguntasRespondidas',
    value: number
  ) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;
    updateUploadStatus(uploadId, upload.status, { [field]: value });
  };

  const handleNumOradoresChange = (uploadId: string, value: number) => {
    const upload = uploads.find((u) => u.id === uploadId);
    if (!upload) return;
    updateUploadStatus(uploadId, upload.status, { numOradores: value });
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
    if (upload && debateData) analyseAudio(uploadId, debateData as Project, selectedDebateType);
  };

  const handleAnalyseAll = () => {
    if (debateData) analyseAll(debateData as Project, selectedDebateType);
  };

  const uploadsByFase = useMemo(() => {
    if (!selectedDebateType) return [];
    const posturas =
      selectedDebateType.posturas && selectedDebateType.posturas.length > 0
        ? selectedDebateType.posturas
        : fallbackPosturas;

    return selectedDebateType.fases.map((fase) => {
      const byFase = uploads.filter((u) => u.faseId === fase.id);
      const completed = posturas.map((postura) => {
        const existing = byFase.find((upload) => getSlotKey(upload.faseNombre, upload.postura) === getSlotKey(fase.nombre, postura));
        if (existing) return existing;
        return {
          id: createUploadId(debateCode, fase.id, postura),
          faseId: fase.id,
          faseNombre: fase.nombre,
          postura,
          numOradores: 1,
          file: null,
          status: 'pending' as const,
        } as AudioUpload;
      });
      return { fase, uploads: completed };
    });
  }, [selectedDebateType, uploads, debateCode, fallbackPosturas[0], fallbackPosturas[1]]);

  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const hasPendingUploads = uploads.some((u) => u.file && u.status === 'pending');
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const completedResults = uploads
    .map((upload) => upload.result)
    .filter((result): result is AnalysisResult => Boolean(result));
  const teamAScorePercent = completedResults
    .filter((result) => result.postura.toLowerCase().includes('favor'))
    .reduce((sum, result, _, arr) => {
      const value = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
      return sum + value / Math.max(1, arr.length);
    }, 0);
  const teamBScorePercent = completedResults
    .filter((result) => result.postura.toLowerCase().includes('contra'))
    .reduce((sum, result, _, arr) => {
      const value = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
      return sum + value / Math.max(1, arr.length);
    }, 0);
  const teamAScore40 = Math.round((teamAScorePercent / 100) * 40);
  const teamBScore40 = Math.round((teamBScorePercent / 100) * 40);
  const timelineSlots = uploadsByFase.flatMap(({ fase, uploads: faseUploads }, faseIdx) =>
    faseUploads.map((upload, slotIdx) => {
      const team: 'A' | 'B' = upload.postura.toLowerCase().includes('favor') ? 'A' : 'B';
      const status = upload.status;
      const hasAnalyzed = status === 'completed' && !!upload.result;
      const isAnalyzing = status === 'analyzing';
      const slotResults = upload.result
        ? [upload.result]
        : completedResults.filter(
            (result) =>
              normalizePhaseName(result.fase) === normalizePhaseName(upload.faseNombre) &&
              result.postura.trim().toLowerCase() === upload.postura.trim().toLowerCase()
          );
      const avg = slotResults.length
        ? slotResults.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / slotResults.length
        : 0;
      return {
        key: `${normalizePhaseName(upload.faseNombre)}::${upload.postura.trim().toLowerCase()}::${faseIdx}-${slotIdx}`,
        phase: upload.faseNombre,
        team,
        avg,
        hasAnalyzed,
        isAnalyzing,
        isCurrent: false,
        results: slotResults,
        slotOrder: faseIdx * 2 + slotIdx,
      };
    })
  );
  const phaseMetrics = timelineSlots;
  const chartPoints = phaseMetrics.map((metric, index) => ({
    x: 24 + index * (phaseMetrics.length > 1 ? 72 / (phaseMetrics.length - 1) : 0),
    y: 84 - Math.min(76, Math.max(6, metric.avg * 0.76)),
  }));
  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  const selectedPhase = phaseMetrics.find((phase) => phase.key === selectedPhaseKey) || null;
  const phaseCriteria = useMemo(() => {
    if (!selectedPhase) return [];
    const merged = new Map<string, { label: string; note: string }>();
    selectedPhase.results.forEach((result) => {
      result.criterios.forEach((criterio) => {
        const key = criterio.criterio.trim().toLowerCase();
        if (!merged.has(key)) merged.set(key, { label: criterio.criterio, note: criterio.anotacion });
      });
    });
    return Array.from(merged.values());
  }, [selectedPhase]);

  useEffect(() => {
    setSelectedCriterionIndex(0);
  }, [selectedPhaseKey]);

  const scorePercent = (result: AnalysisResult) =>
    result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;

  const phaseTeamAScore40 = selectedPhase
    ? Math.round(
        (selectedPhase.results
          .filter((result) => result.postura.toLowerCase().includes('favor'))
          .reduce((sum, result, _, arr) => sum + scorePercent(result) / Math.max(1, arr.length), 0) /
          100) *
          40
      )
    : 0;

  const phaseTeamBScore40 = selectedPhase
    ? Math.round(
        (selectedPhase.results
          .filter((result) => result.postura.toLowerCase().includes('contra'))
          .reduce((sum, result, _, arr) => sum + scorePercent(result) / Math.max(1, arr.length), 0) /
          100) *
          40
      )
    : 0;

  if (!debateData) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-[#2C2C2C]/70">Error: No se proporciono debate ni proyecto</div>
      </div>
    );
  }

  if (!selectedDebateType) {
    return (
      <div className="app-shell flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#2C2C2C]/70" />
      </div>
    );
  }

  return (
    <div className="app-shell overflow-y-auto pb-32">
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[1040px]">
          <BrandHeader className="mb-6" />
          <h1 className="mb-5 text-center text-[72px] leading-none text-[#2C2C2C]">
            {debateData.name || debateData.debate_topic || 'Nombre Debate'}
          </h1>

          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={onBack}
              className="inline-flex h-[64px] w-[64px] items-center justify-center rounded-2xl border border-[#D7D7D5] bg-[#ECECE9] text-[#2C2C2C] hover:opacity-90"
            >
              <ArrowLeft className="h-9 w-9" />
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2C2C2C]/14 bg-[#ECECE9] px-4 py-2 text-[20px] text-[#2C2C2C]"
              >
                <Users className="h-5 w-5" />
                {numOradores} orador{numOradores > 1 ? 'es' : ''}
              </button>
              {allCompleted ? (
                <LiquidGlassButton onClick={onViewResults} variant="primary" className="rounded-xl border-0 bg-[#3A7D44] px-5 py-2.5 text-white">
                  <BarChart3 className="mr-2 inline h-5 w-5" />
                  Ver Dashboard
                </LiquidGlassButton>
              ) : (
                <LiquidGlassButton
                  onClick={handleAnalyseAll}
                  variant="primary"
                  disabled={!hasPendingUploads || isAnalyzing}
                  className="rounded-xl border-0 bg-[#3A7D44] px-5 py-2.5 text-white disabled:opacity-50"
                >
                  {isAnalyzing ? <Loader2 className="mr-2 inline h-5 w-5 animate-spin" /> : <Play className="mr-2 inline h-5 w-5" />}
                  Analizar
                </LiquidGlassButton>
              )}
            </div>
          </div>

          <div className="overflow-hidden">
            <div
              className="flex w-[200%] transition-transform duration-500 ease-out"
              style={{ transform: isDashboardView ? 'translateX(-50%)' : 'translateX(0)' }}
            >
              <section className="w-1/2 pr-2">
                <div className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] px-4 py-4">
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <p className="text-center text-[48px] leading-none text-[#2C2C2C]">{debateData.team_a_name || 'Equipo A'}</p>
                    <p className="text-center text-[48px] leading-none text-[#2C2C2C]">{debateData.team_b_name || 'Equipo B'}</p>
                  </div>

                  <div className="space-y-6">
                    {uploadsByFase.map(({ fase, uploads: faseUploads }) => (
                      <div key={fase.id}>
                        <h3 className="mb-3 text-[40px] font-bold leading-none text-[#2C2C2C]">{fase.nombre}</h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {faseUploads.map((upload) => (
                            <div
                              key={upload.id}
                              className="rounded-[14px] border px-4 py-4"
                              style={{
                                background: getPostureCardTone(upload.postura, teamAColor, teamBColor).background,
                                borderColor: getPostureCardTone(upload.postura, teamAColor, teamBColor).borderColor,
                              }}
                            >
                              <div className="mb-3 flex items-center justify-end">
                                <div className="flex items-center gap-2">
                                  <span className="text-[16px] text-white/85">Nº oradores:</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={upload.numOradores}
                                    onChange={(e) => handleNumOradoresChange(upload.id, parseInt(e.target.value, 10) || 1)}
                                    className="w-14 rounded border border-white/45 bg-white px-2 py-1 text-center text-[16px] text-[#2C2C2C]"
                                  />
                                </div>
                              </div>

                              <div className="mb-4 space-y-3">
                                {fase.permite_minuto_oro && (
                                  <button
                                    onClick={() => handleMinutoOroChange(upload.id, !upload.minutoOroUtilizado)}
                                    className={`w-full rounded-xl border-2 px-4 py-2 text-left text-sm transition-all ${
                                      upload.minutoOroUtilizado
                                        ? 'border-yellow-400 bg-yellow-100 text-yellow-700'
                                        : 'border-white/45 bg-white/90 text-[#2C2C2C]'
                                    }`}
                                  >
                                    {upload.minutoOroUtilizado ? 'Minuto de oro activado' : 'Usar minuto de oro'}
                                  </button>
                                )}

                                {fase.permite_preguntas && (
                                  <div className="space-y-2 rounded-xl border border-white/45 bg-white/85 p-3">
                                    <div className="flex items-center gap-2">
                                      <span className="w-32 text-sm text-[#2C2C2C]/80">Preguntas hechas:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={upload.preguntasRealizadas || 0}
                                        onChange={(e) => handlePreguntasChange(upload.id, 'preguntasRealizadas', parseInt(e.target.value, 10) || 0)}
                                        className="w-16 rounded border border-[#2C2C2C]/15 bg-white px-2 py-1 text-center text-sm text-[#2C2C2C]"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="w-32 text-sm text-[#2C2C2C]/80">Respondidas:</span>
                                      <input
                                        type="number"
                                        min={0}
                                        max={upload.preguntasRealizadas || 0}
                                        value={upload.preguntasRespondidas || 0}
                                        onChange={(e) => handlePreguntasChange(upload.id, 'preguntasRespondidas', parseInt(e.target.value, 10) || 0)}
                                        className="w-16 rounded border border-[#2C2C2C]/15 bg-white px-2 py-1 text-center text-sm text-[#2C2C2C]"
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
              </section>

              <section className="w-1/2 pl-2">
                <div className="relative overflow-hidden rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] p-4 min-h-[660px] lg:min-h-[560px]">
                  <div
                    className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      selectedPhase
                        ? 'pointer-events-none absolute inset-4 translate-x-[-10%] scale-[0.96] opacity-0'
                        : 'relative translate-x-0 scale-100 opacity-100'
                    }`}
                  >
                      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
                        <div className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[24px] text-[#2C2C2C]">{debateData.team_a_name || 'A favor'}:</span>
                            <span className="rounded-xl px-3 py-1 text-[28px] text-white" style={{ background: teamAColor }}>
                              {teamAScore40}
                              <span className="text-[16px] opacity-80">/40</span>
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[24px] text-[#2C2C2C]">{debateData.team_b_name || 'En contra'}:</span>
                            <span className="rounded-xl px-3 py-1 text-[28px] text-white" style={{ background: teamBColor }}>
                              {teamBScore40}
                              <span className="text-[16px] opacity-80">/40</span>
                            </span>
                          </div>
                        </div>

                        <div className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-3 py-2">
                          <p className="text-[28px] leading-none text-[#2C2C2C]">Ptos</p>
                          <svg viewBox="0 0 100 100" className="mt-2 h-[120px] w-full">
                            <line x1="12" y1="8" x2="12" y2="88" stroke="#2C2C2C" strokeWidth="1.8" />
                            <line x1="12" y1="88" x2="94" y2="88" stroke="#2C2C2C" strokeWidth="1.8" />
                            {chartLine && <polyline fill="none" stroke={teamAColor} strokeWidth="2.4" points={chartLine} />}
                            {chartPoints.map((point, index) => (
                              <circle key={`analysis-point-${index}`} cx={point.x} cy={point.y} r="2.2" fill={teamAColor} />
                            ))}
                          </svg>
                          <p className="text-center text-[30px] leading-none text-[#2C2C2C]">Rondas</p>
                        </div>

                        <button className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-4 text-center text-[#2C2C2C]">
                          <p className="text-[44px] leading-tight">Compartir Dashboard</p>
                          <span className="mt-2 inline-block text-[44px]">↗</span>
                        </button>
                      </div>

                      <div className="mt-4 rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-4">
                        <div className="mb-3 grid grid-cols-4 gap-2">
                          {phaseMetrics.filter((phase) => phase.team === 'A').map((phase) => (
                            <button
                              key={`analysis-phase-${phase.key}`}
                              type="button"
                              onClick={() => setSelectedPhaseKey(phase.key)}
                              className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white transition-transform hover:scale-[1.02]"
                              style={{
                                background: phase.hasAnalyzed || phase.isAnalyzing ? teamAColor : '#DADADA',
                                color: '#fff',
                                opacity: phase.hasAnalyzed || phase.isAnalyzing ? 1 : 0.45,
                                cursor: 'pointer',
                              }}
                            >
                              {phase.phase}
                            </button>
                          ))}
                        </div>
                        <div className="relative mt-5">
                          <div className="h-[4px] w-full bg-[#2C2C2C]" />
                          <div className="absolute left-0 right-0 top-[-9px] flex items-center justify-between">
                            {phaseMetrics.map((phase) => (
                              <button
                                key={`analysis-dot-${phase.key}`}
                                type="button"
                                onClick={() => setSelectedPhaseKey(phase.key)}
                                className="flex h-5 w-5 items-center justify-center rounded-full border-2 bg-[#F0F0EE] transition-transform hover:scale-110"
                                style={{ borderColor: phase.hasAnalyzed ? '#3A7D44' : phase.isAnalyzing ? '#E6C068' : '#B8B8B6' }}
                                title={phase.hasAnalyzed ? 'Analizado' : phase.isAnalyzing ? 'Analizando' : 'Pendiente'}
                              >
                                {phase.hasAnalyzed ? (
                                  <img src={checkIcon} alt="" aria-hidden className="h-3 w-3" />
                                ) : phase.isAnalyzing ? (
                                  <img src={loaderIcon} alt="" aria-hidden className="h-3 w-3 animate-spin" />
                                ) : (
                                  <span className="h-2 w-2 rounded-full bg-[#B8B8B6]" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-4 gap-2">
                          {phaseMetrics.filter((phase) => phase.team === 'B').map((phase) => (
                            <button
                              key={`analysis-phase-bottom-${phase.key}`}
                              type="button"
                              onClick={() => setSelectedPhaseKey(phase.key)}
                              className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white transition-transform hover:scale-[1.02]"
                              style={{
                                background: phase.hasAnalyzed || phase.isAnalyzing ? teamBColor : '#DADADA',
                                color: '#fff',
                                opacity: phase.hasAnalyzed || phase.isAnalyzing ? 1 : 0.45,
                                cursor: 'pointer',
                              }}
                            >
                              {phase.phase}
                            </button>
                          ))}
                        </div>
                      </div>
                  </div>

                  <div
                    className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      selectedPhase
                        ? 'relative translate-x-0 scale-100 opacity-100'
                        : 'pointer-events-none absolute inset-4 translate-x-[10%] scale-[0.96] opacity-0'
                    }`}
                  >
                  {selectedPhase && (
                    <div className="rounded-2xl px-4 py-4 text-white" style={{ background: selectedPhase.team === 'A' ? teamAColor : teamBColor }}>
                      <div className="mb-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setSelectedPhaseKey(null)}
                          className="rounded-full bg-white/20 px-3 py-1 text-[28px] leading-none text-white"
                        >
                          ‹
                        </button>
                        <h3 className="text-[58px] leading-none">{selectedPhase.phase}</h3>
                        <div className="w-10" />
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[0.95fr_1fr_0.9fr]">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                            <p className="text-[18px] leading-none">PTOS</p>
                            <p className="mt-2 text-[54px] leading-none">
                              {phaseTeamAScore40}
                              <span className="text-[26px] opacity-60">/40</span>
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                            <p className="text-[18px] leading-none">PTOS</p>
                            <p className="mt-2 text-[54px] leading-none">
                              {phaseTeamBScore40}
                              <span className="text-[26px] opacity-60">/40</span>
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                            <p className="text-[18px] leading-none">DURACION</p>
                            <p className="mt-2 text-[54px] leading-none">1:30</p>
                          </div>
                          <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                            <p className="text-[18px] leading-none">ENERGIA</p>
                            <p className="mt-2 text-[54px] leading-none">{Math.round(selectedPhase.avg || 0)}</p>
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                          <div className="space-y-1">
                            {phaseCriteria.slice(0, 8).map((criterion, index) => (
                              <button
                                key={`analysis-phase-criterion-${criterion.label}`}
                                onClick={() => setSelectedCriterionIndex(index)}
                                className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left"
                                style={{ background: selectedCriterionIndex === index ? '#F1F1F0' : 'transparent' }}
                              >
                                <span className="text-[26px] leading-none">{criterion.label}</span>
                                <span className="text-[34px] leading-none">›</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white p-3 text-[#2C2C2C]">
                          <p className="text-[22px] leading-tight">
                            {phaseCriteria[selectedCriterionIndex]?.note ||
                              (selectedPhase.hasAnalyzed
                                ? 'Sin anotaciones para esta fase.'
                                : selectedPhase.isAnalyzing
                                ? 'Analizando esta fase... en unos segundos apareceran las metricas.'
                                : 'Esta fase aun no tiene analisis disponible.')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              aria-label="Cambiar vista analisis"
              onClick={() => setDashboardView(!isDashboardView)}
              className="relative h-[34px] w-[78px] rounded-full border border-[#CFCFCD] bg-[#E3E3E1]"
            >
              <span
                className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
                style={{ left: '18px', background: isDashboardView ? '#A9A9A7' : '#000000' }}
              />
              <span
                className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
                style={{ right: '18px', background: isDashboardView ? '#000000' : '#A9A9A7' }}
              />
            </button>
          </div>
        </div>
      </div>

      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfigModal(false)} />
          <div className="relative w-full max-w-sm rounded-3xl border border-[#2C2C2C]/18 bg-[#F5F5F3] p-6">
            <h3 className="mb-5 text-[34px] leading-none text-[#2C2C2C]">Configuracion</h3>
            <label className="mb-2 block text-[20px] text-[#2C2C2C]/80">Numero de oradores por equipo</label>
            <input
              type="number"
              min={1}
              max={5}
              value={numOradores}
              onChange={(e) => setNumOradores(parseInt(e.target.value, 10) || 1)}
              className="mb-5 w-full rounded-xl border border-[#2C2C2C]/18 bg-white px-4 py-3 text-[20px] text-[#2C2C2C] outline-none"
            />
            <LiquidGlassButton onClick={() => setShowConfigModal(false)} variant="primary" className="w-full rounded-xl border-0 bg-[#3A7D44] text-white">
              Guardar
            </LiquidGlassButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisScreen;
