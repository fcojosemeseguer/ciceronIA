/**
 * AnalysisScreen - Pantalla de analisis de audios con layout Figma.
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

const getPostureCardTone = (postura: string, teamAColor: string, teamBColor: string) => {
  const normalized = postura.trim().toLowerCase();
  return normalized.includes('favor')
    ? { borderColor: `${teamAColor}40`, background: teamAColor, label: 'text-white' }
    : { borderColor: `${teamBColor}40`, background: teamBColor, label: 'text-white' };
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
  const persistedColors = useMemo(() => {
    if (!debateCode) return null;
    return loadDebateTeamColors(debateCode);
  }, [debateCode]);
  const teamAColor = debate?.team_a_color || persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = debate?.team_b_color || persistedColors?.team_b_color || '#C44536';

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

      const hydratedUploads = buildUploadsFromProgress(selectedDebateType, debateCode, analyses, draftUploads);
      replaceUploads(hydratedUploads);
      const restoredSpeakerCount = hydratedUploads.find((upload) => upload.numOradores > 1)?.numOradores;
      if (restoredSpeakerCount) setNumOradores(restoredSpeakerCount);
    };

    hydrateUploads();
    return () => {
      cancelled = true;
    };
  }, [debateCode, replaceUploads, selectedDebateType]);

  useEffect(() => {
    if (!debateCode || uploads.length === 0) return;
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

  const uploadsByFase = useMemo(
    () =>
      selectedDebateType?.fases.map((fase) => ({
        fase,
        uploads: uploads.filter((u) => u.faseId === fase.id),
      })) || [],
    [selectedDebateType, uploads]
  );

  const completedCount = getCompletedCount();
  const totalCount = getTotalCount();
  const hasPendingUploads = uploads.some((u) => u.file && u.status === 'pending');
  const allCompleted = totalCount > 0 && completedCount === totalCount;

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
                        <div className="mb-3 flex items-center justify-between">
                          <span className={`text-[24px] font-semibold ${getPostureCardTone(upload.postura, teamAColor, teamBColor).label}`}>{upload.postura}</span>
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
