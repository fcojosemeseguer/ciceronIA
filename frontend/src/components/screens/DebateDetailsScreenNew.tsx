/**
 * DebateDetailsScreenNew - Vista de dashboard del debate (estilo Figma).
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { Debate, AnalysisResult, ProjectDashboardResponse } from '../../types';
import { useUnifiedDebateStore } from '../../store';
import { BrandHeader, LiquidGlassButton } from '../common';
import { debatesService } from '../../api/debates';

interface DebateDetailsScreenProps {
  debate: Debate;
  onBack: () => void;
  onContinue?: () => void;
}

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatPercent = (value: number) => `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;

export const DebateDetailsScreen: React.FC<DebateDetailsScreenProps> = ({ debate, onBack, onContinue }) => {
  const { deleteDebate } = useUnifiedDebateStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | undefined>(undefined);
  const [view, setView] = useState<'overview' | 'phase'>('overview');
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string | null>(null);
  const [selectedCriterionIndex, setSelectedCriterionIndex] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadDebateDetails = async () => {
      if (debate.mode !== 'analysis') return;

      setIsLoadingAnalysis(true);
      setAnalysisError(null);

      try {
        const result = await debatesService.getDebate(debate.code, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 80,
          offset: 0,
        });

        if (!isMounted) return;
        setAnalyses(result.analyses || []);
        setDashboard(result.dashboard);
      } catch (_error) {
        if (!isMounted) return;
        setAnalysisError('No se pudieron cargar las calificaciones de este debate.');
      } finally {
        if (isMounted) setIsLoadingAnalysis(false);
      }
    };

    loadDebateDetails();
    return () => {
      isMounted = false;
    };
  }, [debate.code, debate.mode]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteDebate(debate.code);
      onBack();
    } catch (error) {
      console.error('Error deleting debate:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const isContinuable = debate.status === 'draft' || debate.status === 'in_progress';
  const teamALabel = 'A favor';
  const teamBLabel = 'En contra';

  const scoreByFase = useMemo(() => {
    const fromDashboard = dashboard?.summary?.score_by_fase;
    if (fromDashboard) {
      return Object.entries(fromDashboard).map(([fase, score]) => ({
        key: normalizeKey(fase),
        fase,
        average: score.avg_score_percent,
      }));
    }

    const grouped = new Map<string, { fase: string; total: number; count: number }>();
    analyses.forEach((analysis) => {
      const key = normalizeKey(analysis.fase);
      const current = grouped.get(key) || { fase: analysis.fase, total: 0, count: 0 };
      const score = analysis.score_percent ?? (analysis.total / Math.max(1, analysis.max_total)) * 100;
      grouped.set(key, { fase: current.fase, total: current.total + score, count: current.count + 1 });
    });
    return Array.from(grouped.values()).map((item) => ({
      key: normalizeKey(item.fase),
      fase: item.fase,
      average: item.count ? item.total / item.count : 0,
    }));
  }, [analyses, dashboard]);

  useEffect(() => {
    if (!selectedPhaseKey && scoreByFase.length > 0) {
      setSelectedPhaseKey(scoreByFase[0].key);
    }
  }, [scoreByFase, selectedPhaseKey]);

  const phaseDetail = useMemo(() => {
    if (!selectedPhaseKey) return null;
    const phaseName = scoreByFase.find((item) => item.key === selectedPhaseKey)?.fase || '';
    const related = analyses.filter((analysis) => normalizeKey(analysis.fase) === selectedPhaseKey);

    const aItems = related.filter((analysis) => analysis.postura.trim().toLowerCase() === teamALabel.toLowerCase());
    const bItems = related.filter((analysis) => analysis.postura.trim().toLowerCase() === teamBLabel.toLowerCase());

    const avg = (items: AnalysisResult[]) =>
      items.length
        ? items.reduce((sum, analysis) => sum + (analysis.score_percent ?? (analysis.total / Math.max(1, analysis.max_total)) * 100), 0) / items.length
        : 0;

    const sample = related[0] || null;
    const criteria = sample?.criterios || [];
    const selectedCriterion = criteria[selectedCriterionIndex] || null;
    const selectedCriterionNote = selectedCriterion?.anotacion || 'Sin anotacion para este criterio.';

    return {
      phaseName: phaseName || 'Introduccion',
      avgA: avg(aItems),
      avgB: avg(bItems),
      totalSegments: related.length,
      criteria,
      selectedCriterionIndex,
      selectedCriterionNote,
    };
  }, [analyses, scoreByFase, selectedCriterionIndex, selectedPhaseKey]);

  const maxScore = Math.max(1, ...scoreByFase.map((phase) => phase.average));

  return (
    <div className="app-shell overflow-y-auto pb-32">
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[1120px]">
          <BrandHeader className="mb-6" />
          <h1 className="mb-7 text-center text-[72px] leading-none text-[#2C2C2C]">[{debate.name || 'Nombre Debate'}]</h1>

          {view === 'overview' ? (
            <section className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] p-4">
              <div className="grid gap-3 lg:grid-cols-[1fr_340px_220px]">
                <div className="rounded-2xl border-[4px] border-[#1C1D1F] bg-[#ECECE9] p-3" />
                <div className="rounded-2xl border-[4px] border-[#1C1D1F] bg-[#ECECE9] p-3">
                  <p className="text-[34px] leading-none text-[#2C2C2C]">Ptos</p>
                  <div className="mt-3 h-[130px] rounded-lg border border-[#2C2C2C]/25 p-3">
                    <div className="mb-2 flex h-1.5 items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#3A6EA5]" />
                    </div>
                    <div className="h-[88px] border-l-[3px] border-b-[3px] border-[#2C2C2C]" />
                  </div>
                  <p className="mt-2 text-center text-[40px] leading-none text-[#2C2C2C]">Rondas</p>
                </div>
                <button className="rounded-2xl border-[4px] border-[#1C1D1F] bg-[#ECECE9] p-4 text-center">
                  <p className="text-[40px] leading-tight text-[#2C2C2C]">Compartir Dashboard En Vivo</p>
                  <ExternalLink className="mx-auto mt-5 h-10 w-10 text-[#2C2C2C]" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border-[4px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-5">
                <div className="mb-3 grid gap-3 md:grid-cols-4">
                  {scoreByFase.map((phase, index) => (
                    <button
                      key={`phase-a-${phase.key}`}
                      onClick={() => {
                        setSelectedPhaseKey(phase.key);
                        setView('phase');
                        setSelectedCriterionIndex(0);
                      }}
                      className="rounded-[14px] px-4 py-2 text-[34px] leading-none text-white"
                      style={{ background: index === 0 ? '#3A6EA5' : '#DADADA', color: index === 0 ? '#fff' : '#F5F5F3' }}
                    >
                      {phase.fase}
                    </button>
                  ))}
                </div>
                <div className="mb-3 h-[4px] bg-[#2C2C2C]">
                  <div className="h-[4px] w-1/2 bg-[#3A6EA5]" />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  {scoreByFase.map((phase, index) => (
                    <button
                      key={`phase-b-${phase.key}`}
                      onClick={() => {
                        setSelectedPhaseKey(phase.key);
                        setView('phase');
                        setSelectedCriterionIndex(0);
                      }}
                      className="rounded-[14px] px-4 py-2 text-[34px] leading-none text-white"
                      style={{ background: index === 0 ? '#C44536' : '#DADADA', color: index === 0 ? '#fff' : '#F5F5F3' }}
                    >
                      {phase.fase}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="rounded-[20px] bg-[#3A6EA5] p-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setView('overview')}
                  className="inline-flex items-center gap-2 text-[48px] leading-none text-white"
                >
                  <ChevronLeft className="h-8 w-8" />
                  {phaseDetail?.phaseName || 'Fase'}
                </button>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr_1fr]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-[#F5F5F3] p-3">
                    <p className="text-[34px] leading-none text-[#2C2C2C]">PTOS</p>
                    <p className="mt-2 text-[90px] font-bold leading-none text-[#2C2C2C]">
                      {Math.round((phaseDetail?.avgA || 0) / 2)}
                      <span className="text-[54px] text-[#2C2C2C]/60">/40</span>
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F5F3] p-3">
                    <p className="text-[34px] leading-none text-[#2C2C2C]">PPM</p>
                    <p className="mt-2 text-[90px] font-bold leading-none text-[#2C2C2C]">
                      {Math.max(35, Math.round(phaseDetail?.avgA || 0))}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F5F3] p-3">
                    <p className="text-[34px] leading-none text-[#2C2C2C]">DURACION</p>
                    <p className="mt-2 text-[90px] font-bold leading-none text-[#2C2C2C]">1:30</p>
                  </div>
                  <div className="rounded-2xl bg-[#F5F5F3] p-3">
                    <p className="text-[34px] leading-none text-[#2C2C2C]">ENERGIA</p>
                    <p className="mt-2 text-[90px] font-bold leading-none text-[#2C2C2C]">
                      {Math.max(30, Math.round((phaseDetail?.avgB || 0) + 20))}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#F5F5F3] p-3">
                  {phaseDetail?.criteria.length ? (
                    <div className="space-y-1">
                      {phaseDetail.criteria.map((criterion, index) => (
                        <button
                          key={`${criterion.criterio}-${index}`}
                          onClick={() => setSelectedCriterionIndex(index)}
                          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[38px] leading-none ${
                            index === selectedCriterionIndex ? 'bg-[#E8E8E8] text-[#2C2C2C]' : 'text-[#2C2C2C]'
                          }`}
                        >
                          <span className="truncate">{criterion.criterio}</span>
                          <ChevronRight className="h-5 w-5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center text-[28px] text-[#2C2C2C]/60">
                      Sin criterios todavia
                    </div>
                  )}
                </div>

                <div className="rounded-2xl bg-[#F5F5F3] p-3">
                  <p className="text-[32px] leading-tight text-[#2C2C2C]">{phaseDetail?.selectedCriterionNote || 'Mensaje obtenido del backend'}</p>
                </div>
              </div>
            </section>
          )}

          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2C2C2C]/70" />
            <button
              onClick={() => setView((prev) => (prev === 'overview' ? 'phase' : 'overview'))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#2C2C2C]/15 bg-[#ECECE9] text-[#2C2C2C]"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>

          {debate.mode === 'analysis' && (
            <div className="mt-4 rounded-2xl border border-[#2C2C2C]/15 bg-[#ECECE9] p-4">
              {isLoadingAnalysis ? (
                <div className="flex items-center gap-2 text-[#2C2C2C]/70">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Cargando analisis...
                </div>
              ) : analysisError ? (
                <p className="text-red-700">{analysisError}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <p className="text-[24px] text-[#2C2C2C]">Segmentos: {dashboard?.summary?.total_segments ?? analyses.length}</p>
                  <p className="text-[24px] text-[#2C2C2C]">Media: {formatPercent(dashboard?.summary?.average_score_percent ?? 0)}</p>
                  <p className="text-[24px] text-[#2C2C2C]">Fases: {scoreByFase.length}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isContinuable && onContinue && (
              <LiquidGlassButton onClick={onContinue} variant="primary" className="rounded-xl border-0 bg-[#3A7D44] px-5 py-2.5 text-white">
                Continuar
              </LiquidGlassButton>
            )}
            <LiquidGlassButton onClick={onBack} variant="secondary" className="rounded-xl border border-[#2C2C2C]/15 bg-[#ECECE9] px-5 py-2.5 text-[#2C2C2C]">
              Volver
            </LiquidGlassButton>
            <LiquidGlassButton onClick={() => setShowDeleteConfirm(true)} variant="danger" className="rounded-xl border-0 bg-[#C44536] px-5 py-2.5 text-white">
              <Trash2 className="mr-2 inline h-4 w-4" />
              Eliminar
            </LiquidGlassButton>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[#2C2C2C]/18 bg-[#F5F5F3] p-6">
            <h3 className="mb-2 text-[32px] leading-none text-[#2C2C2C]">Eliminar debate</h3>
            <p className="mb-6 text-[24px] leading-tight text-[#2C2C2C]/75">Esta accion no se puede deshacer.</p>
            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => setShowDeleteConfirm(false)}
                variant="secondary"
                className="flex-1 rounded-xl border border-[#2C2C2C]/15 bg-[#ECECE9] text-[#2C2C2C]"
              >
                Cancelar
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={handleDelete}
                variant="danger"
                className="flex-1 rounded-xl border-0 bg-[#C44536] text-white"
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Eliminar'}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebateDetailsScreen;
