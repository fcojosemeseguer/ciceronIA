/**
 * AnalysisScreen - Análisis de audios con layout fijo y dashboard compartido.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BarChart3, Loader2, Play, Users } from 'lucide-react';
import { debatesService } from '../../api';
import { useProjectStore, useAnalysisStore } from '../../store';
import {
  AudioUpload,
  Debate,
  DebateType,
  AnalysisResult,
  Project,
  ProjectDashboardResponse,
} from '../../types';
import { BrandHeader, LiquidGlassButton, AudioDropZone } from '../common';
import EmbeddedDebateDashboard from '../common/EmbeddedDebateDashboard';
import { clearAnalysisDraft, loadAnalysisDraft, saveAnalysisDraft } from '../../utils/debatePersistence';
import { loadDebateTeamColors } from '../../utils/debateColors';
import { normalizePhaseName } from '../../utils/roundsSequence';
import {
  averageScore,
  buildDurationLookup,
  DashboardSlot,
  getDashboardSlotKey,
  mergeCriteriaNotes,
} from '../../utils/dashboardViewModel';
import { useDashboardShareLink } from '../../hooks/useDashboardShareLink';

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
  const baseColor = normalized.includes('favor') ? teamAColor : teamBColor;

  return {
    borderColor: `${baseColor}55`,
    background: `${baseColor}1A`,
  };
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
  const [dashboardData, setDashboardData] = useState<ProjectDashboardResponse | undefined>(undefined);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const autoOpenedSlotRef = useRef<string | null>(null);
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
  const fallbackTeamAName = debateData?.team_a_name || 'A favor';
  const fallbackTeamBName = debateData?.team_b_name || 'En contra';
  const fallbackPosturas = useMemo(
    () => [fallbackTeamAName, fallbackTeamBName],
    [fallbackTeamAName, fallbackTeamBName]
  );

  const {
    shareState,
    createShareLink,
    copyShareLink,
    openShareLink,
    dismissShareLink,
  } = useDashboardShareLink(debateCode);

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
      let nextDashboard: ProjectDashboardResponse | undefined;

      try {
        const response = await debatesService.getDebate(debateCode, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 100,
          offset: 0,
        });
        analyses = response.analyses || [];
        nextDashboard = response.dashboard;
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
      setDashboardData(nextDashboard);

      const restoredSpeakerCount = hydratedUploads.find((upload) => upload.numOradores > 1)?.numOradores;
      if (restoredSpeakerCount) setNumOradores(restoredSpeakerCount);
    };

    void hydrateUploads();
    return () => {
      cancelled = true;
    };
  }, [debateCode, replaceUploads, selectedDebateType, fallbackPosturas]);

  const completedCount = getCompletedCount();

  useEffect(() => {
    if (!debateCode) return;
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await debatesService.getDebate(debateCode, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 100,
          offset: 0,
        });

        if (!cancelled) {
          setDashboardData(response.dashboard);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo refrescar el dashboard del analisis', error);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [debateCode, completedCount]);

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
    const upload = uploads.find((item) => item.id === uploadId);
    if (!upload) return;
    updateUploadStatus(uploadId, upload.status, { minutoOroUtilizado: value });
  };

  const handlePreguntasChange = (
    uploadId: string,
    field: 'preguntasRealizadas' | 'preguntasRespondidas',
    value: number
  ) => {
    const upload = uploads.find((item) => item.id === uploadId);
    if (!upload) return;
    updateUploadStatus(uploadId, upload.status, { [field]: value });
  };

  const handleNumOradoresChange = (uploadId: string, value: number) => {
    const upload = uploads.find((item) => item.id === uploadId);
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
    const upload = uploads.find((item) => item.id === uploadId);
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
      const byFase = uploads.filter((upload) => upload.faseId === fase.id);
      const completed = posturas.map((postura) => {
        const existing = byFase.find(
          (upload) =>
            getSlotKey(upload.faseNombre, upload.postura) === getSlotKey(fase.nombre, postura)
        );
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
  }, [selectedDebateType, uploads, debateCode, fallbackPosturas]);

  const totalCount = getTotalCount();
  const hasPendingUploads = uploads.some((upload) => upload.file && upload.status === 'pending');
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const completedResults = useMemo(
    () =>
      uploads
        .map((upload) => upload.result)
        .filter((result): result is AnalysisResult => Boolean(result)),
    [uploads]
  );

  const timelineSlots: DashboardSlot[] = useMemo(() => {
    const durationLookup = buildDurationLookup(
      dashboardData?.segments.items,
      fallbackTeamAName,
      fallbackTeamBName
    );

    return uploadsByFase.flatMap(({ uploads: faseUploads }) =>
      faseUploads.map((upload) => {
        const team: 'A' | 'B' = upload.postura.toLowerCase().includes('favor') ? 'A' : 'B';
        const key = getDashboardSlotKey(upload.faseNombre, team);
        const slotResults = upload.result
          ? [upload.result]
          : completedResults.filter(
              (result) =>
                normalizePhaseName(result.fase) === normalizePhaseName(upload.faseNombre) &&
                result.postura.trim().toLowerCase() === upload.postura.trim().toLowerCase()
            );

        const status =
          upload.status === 'completed' && slotResults.length > 0
            ? 'analyzed'
            : upload.status === 'analyzing' ||
                upload.status === 'uploading' ||
                upload.status === 'converting'
              ? 'analyzing'
              : 'pending';

        return {
          key,
          phase: upload.faseNombre,
          team,
          teamName: team === 'A' ? fallbackTeamAName : fallbackTeamBName,
          avg: averageScore(slotResults),
          status,
          durationSeconds: durationLookup.get(key) ?? null,
          isCurrent: false,
          isSelectable: status !== 'pending' || Boolean(upload.file) || Boolean(upload.persistedFileName),
          results: slotResults,
        };
      })
    );
  }, [
    uploadsByFase,
    completedResults,
    dashboardData?.segments.items,
    fallbackTeamAName,
    fallbackTeamBName,
  ]);

  const selectedSlot = useMemo(
    () => timelineSlots.find((slot) => slot.key === selectedSlotKey) || null,
    [timelineSlots, selectedSlotKey]
  );

  const selectedCriteria = useMemo(
    () => mergeCriteriaNotes(selectedSlot?.results || []),
    [selectedSlot]
  );

  useEffect(() => {
    autoOpenedSlotRef.current = null;
    setSelectedCriterionId(null);
  }, [selectedSlotKey]);

  useEffect(() => {
    if (!selectedSlotKey || selectedCriteria.length === 0) return;
    if (autoOpenedSlotRef.current === selectedSlotKey) return;

    setSelectedCriterionId(selectedCriteria[0].id);
    autoOpenedSlotRef.current = selectedSlotKey;
  }, [selectedSlotKey, selectedCriteria]);

  if (!debateData) {
    return (
      <div className="app-shell app-fixed-screen">
        <div className="app-fixed-screen__body flex items-center justify-center">
          <div className="text-[#2C2C2C]/70">Error: No se proporciono debate ni proyecto</div>
        </div>
      </div>
    );
  }

  if (!selectedDebateType) {
    return (
      <div className="app-shell app-fixed-screen">
        <div className="app-fixed-screen__body flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#2C2C2C]/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-fixed-screen">
      <div className="app-fixed-screen__body px-5 py-6 sm:px-8">
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
          <BrandHeader className="mb-5 shrink-0" />
          <h1 className="mb-4 shrink-0 text-center text-[40px] leading-none text-[#2C2C2C] sm:text-[54px]">
            {debateData.name || debateData.debate_topic || 'Nombre Debate'}
          </h1>

          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
            <button
              onClick={onBack}
              className="inline-flex h-[60px] w-[60px] items-center justify-center rounded-2xl border border-[#D7D7D5] bg-[#ECECE9] text-[#2C2C2C] hover:opacity-90"
            >
              <ArrowLeft className="h-8 w-8" />
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowConfigModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#2C2C2C]/14 bg-[#ECECE9] px-4 py-2 text-[18px] text-[#2C2C2C]"
              >
                <Users className="h-5 w-5" />
                {numOradores} orador{numOradores > 1 ? 'es' : ''}
              </button>

              {allCompleted ? (
                <LiquidGlassButton
                  onClick={onViewResults}
                  variant="primary"
                  className="rounded-xl border-0 bg-[#3A7D44] px-5 py-2.5 text-white"
                >
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
                  {isAnalyzing ? (
                    <Loader2 className="mr-2 inline h-5 w-5 animate-spin" />
                  ) : (
                    <Play className="mr-2 inline h-5 w-5" />
                  )}
                  Analizar
                </LiquidGlassButton>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className="flex h-full w-[200%] transition-transform duration-500 ease-out"
              style={{ transform: isDashboardView ? 'translateX(-50%)' : 'translateX(0)' }}
            >
              <section className="h-full w-1/2 pr-2">
                <div className="flex h-full flex-col rounded-[24px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] px-4 py-4">
                  <div className="mb-4 grid shrink-0 grid-cols-2 gap-4">
                    <p className="text-center text-[36px] leading-none text-[#2C2C2C] sm:text-[42px]">
                      {debateData.team_a_name || 'Equipo A'}
                    </p>
                    <p className="text-center text-[36px] leading-none text-[#2C2C2C] sm:text-[42px]">
                      {debateData.team_b_name || 'Equipo B'}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <div className="space-y-5">
                      {uploadsByFase.map(({ fase, uploads: faseUploads }) => (
                        <div key={fase.id}>
                          <h3 className="mb-3 text-[28px] font-bold leading-none text-[#2C2C2C] sm:text-[34px]">
                            {fase.nombre}
                          </h3>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {faseUploads.map((upload) => {
                              const tone = getPostureCardTone(upload.postura, teamAColor, teamBColor);

                              return (
                                <div
                                  key={upload.id}
                                  className="rounded-[16px] border px-4 py-4"
                                  style={{
                                    background: tone.background,
                                    borderColor: tone.borderColor,
                                  }}
                                >
                                  <div className="mb-3 flex items-center justify-end">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[15px] text-white/85">Nº oradores:</span>
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={upload.numOradores}
                                        onChange={(e) =>
                                          handleNumOradoresChange(upload.id, parseInt(e.target.value, 10) || 1)
                                        }
                                        className="w-14 rounded border border-white/45 bg-white px-2 py-1 text-center text-[15px] text-[#2C2C2C]"
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
                                            onChange={(e) =>
                                              handlePreguntasChange(
                                                upload.id,
                                                'preguntasRealizadas',
                                                parseInt(e.target.value, 10) || 0
                                              )
                                            }
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
                                            onChange={(e) =>
                                              handlePreguntasChange(
                                                upload.id,
                                                'preguntasRespondidas',
                                                parseInt(e.target.value, 10) || 0
                                              )
                                            }
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
                                    teamAColor={teamAColor}
                                    teamBColor={teamBColor}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="h-full w-1/2 pl-2">
                <EmbeddedDebateDashboard
                  slots={timelineSlots}
                  teamAName={debateData.team_a_name || 'A favor'}
                  teamBName={debateData.team_b_name || 'En contra'}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  selectedSlotKey={selectedSlotKey}
                  onSelectSlot={setSelectedSlotKey}
                  onClearSelectedSlot={() => setSelectedSlotKey(null)}
                  criteria={selectedCriteria}
                  selectedCriterionId={selectedCriterionId}
                  onSelectCriterion={(criterionId) =>
                    setSelectedCriterionId((prev) => (prev === criterionId ? null : criterionId))
                  }
                  shareLabel="Compartir Dashboard"
                  shareState={shareState}
                  onShare={createShareLink}
                  onCopyShare={copyShareLink}
                  onOpenShare={openShareLink}
                  onDismissShare={dismissShareLink}
                />
              </section>
            </div>
          </div>

          <div className="mt-4 flex justify-center shrink-0">
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
            <LiquidGlassButton
              onClick={() => setShowConfigModal(false)}
              variant="primary"
              className="w-full rounded-xl border-0 bg-[#3A7D44] text-white"
            >
              Guardar
            </LiquidGlassButton>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisScreen;
