/**
 * DebateDetailsScreenNew - Dashboard histórico reutilizando el shell compartido.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Debate, AnalysisResult, ProjectDashboardResponse } from '../../types';
import { useUnifiedDebateStore } from '../../store';
import { BrandHeader, LiquidGlassButton } from '../common';
import EmbeddedDebateDashboard from '../common/EmbeddedDebateDashboard';
import { debatesService } from '../../api/debates';
import {
  averageScore,
  buildDurationLookup,
  DashboardSlot,
  getDashboardSlotKey,
  getPhaseSequence,
  getTeamFromPosture,
  mergeCriteriaNotes,
} from '../../utils/dashboardViewModel';
import { loadDebateTeamColors } from '../../utils/debateColors';
import { useDashboardShareLink } from '../../hooks/useDashboardShareLink';

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
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const autoOpenedSlotRef = useRef<string | null>(null);

  const persistedColors = useMemo(() => loadDebateTeamColors(debate.code), [debate.code]);
  const teamAColor = debate.team_a_color || persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = debate.team_b_color || persistedColors?.team_b_color || '#C44536';
  const teamAName = debate.team_a_name || 'A favor';
  const teamBName = debate.team_b_name || 'En contra';

  const {
    shareState,
    createShareLink,
    copyShareLink,
    openShareLink,
    dismissShareLink,
  } = useDashboardShareLink(debate.code);

  useEffect(() => {
    let isMounted = true;

    const loadDebateDetails = async () => {
      setIsLoadingAnalysis(true);
      setAnalysisError(null);

      try {
        const result = await debatesService.getDebate(debate.code, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 100,
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

    void loadDebateDetails();
    return () => {
      isMounted = false;
    };
  }, [debate.code]);

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
  const phaseSequence = useMemo(() => getPhaseSequence(debate.debate_type), [debate.debate_type]);
  const durationLookup = useMemo(
    () => buildDurationLookup(dashboard?.segments.items, teamAName, teamBName),
    [dashboard?.segments.items, teamAName, teamBName]
  );

  const slots: DashboardSlot[] = useMemo(
    () =>
      phaseSequence.flatMap((phase) =>
        (['A', 'B'] as const).map((team) => {
          const results = analyses.filter(
            (analysis) =>
              normalizeKey(analysis.fase) === normalizeKey(phase) &&
              getTeamFromPosture(analysis.postura, teamAName, teamBName) === team
          );

          const key = getDashboardSlotKey(phase, team);

          return {
            key,
            phase,
            team,
            teamName: team === 'A' ? teamAName : teamBName,
            avg: averageScore(results),
            status: results.length > 0 ? 'analyzed' : 'pending',
            durationSeconds: durationLookup.get(key) ?? null,
            isCurrent: false,
            isSelectable: results.length > 0,
            results,
          };
        })
      ),
    [analyses, durationLookup, phaseSequence, teamAName, teamBName]
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.key === selectedSlotKey) || null,
    [slots, selectedSlotKey]
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

  return (
    <div className="app-shell app-fixed-screen">
      <div className="app-fixed-screen__body px-5 py-6 sm:px-8">
        <div className="mx-auto flex h-full w-full max-w-[1200px] flex-col">
          <BrandHeader className="mb-5 shrink-0" />
          <h1 className="mb-5 shrink-0 text-center text-[40px] leading-none text-[#2C2C2C] sm:text-[56px]">
            {debate.name || 'Nombre Debate'}
          </h1>

          <div className="min-h-0 flex-1">
            <EmbeddedDebateDashboard
              slots={slots}
              teamAName={teamAName}
              teamBName={teamBName}
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
          </div>

          <div className="mt-4 shrink-0 rounded-2xl border border-[#2C2C2C]/15 bg-[#ECECE9] px-4 py-3">
            {isLoadingAnalysis ? (
              <div className="flex items-center gap-2 text-[#2C2C2C]/70">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando analisis...
              </div>
            ) : analysisError ? (
              <p className="text-red-700">{analysisError}</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <p className="text-[20px] text-[#2C2C2C]">
                  Segmentos: {dashboard?.summary?.total_segments ?? analyses.length}
                </p>
                <p className="text-[20px] text-[#2C2C2C]">
                  Media: {formatPercent(dashboard?.summary?.average_score_percent ?? 0)}
                </p>
                <p className="text-[20px] text-[#2C2C2C]">Fases: {phaseSequence.length}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex shrink-0 flex-wrap justify-center gap-3">
            {isContinuable && onContinue && (
              <LiquidGlassButton
                onClick={onContinue}
                variant="primary"
                className="rounded-xl border-0 bg-[#3A7D44] px-5 py-2.5 text-white"
              >
                Continuar
              </LiquidGlassButton>
            )}
            <LiquidGlassButton
              onClick={onBack}
              variant="secondary"
              className="rounded-xl border border-[#2C2C2C]/15 bg-[#ECECE9] px-5 py-2.5 text-[#2C2C2C]"
            >
              Volver
            </LiquidGlassButton>
            <LiquidGlassButton
              onClick={() => setShowDeleteConfirm(true)}
              variant="danger"
              className="rounded-xl border-0 bg-[#C44536] px-5 py-2.5 text-white"
            >
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
            <p className="mb-6 text-[24px] leading-tight text-[#2C2C2C]/75">
              Esta accion no se puede deshacer.
            </p>
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
