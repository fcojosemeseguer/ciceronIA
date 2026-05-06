import { AnalysisResult, ProjectSegment } from '../types';

export type DashboardSlotStatus = 'pending' | 'recording' | 'analyzing' | 'analyzed';

export interface DashboardSlot {
  key: string;
  phase: string;
  team: 'A' | 'B';
  teamName: string;
  avg: number;
  status: DashboardSlotStatus;
  durationSeconds: number | null;
  isCurrent?: boolean;
  isSelectable?: boolean;
  results: AnalysisResult[];
  segments?: ProjectSegment[];
}

export interface DashboardCriterionItem {
  id: string;
  label: string;
  note: string;
}

export const normalizeDashboardText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const getDashboardSlotKey = (phase: string, team: 'A' | 'B') =>
  `${normalizeDashboardText(phase)}::${team}`;

export const scorePercent = (result: AnalysisResult) =>
  result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;

export const averageScore = (results: AnalysisResult[]) =>
  results.length
    ? results.reduce((sum, result) => sum + scorePercent(result), 0) / results.length
    : 0;

export const scoreTo40 = (value: number) => Math.round((value / 100) * 40);

export const formatDashboardDuration = (seconds: number | null | undefined) => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '—';

  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${mins}:${String(secs).padStart(2, '0')}`;
};

export const getTeamFromPosture = (
  postura: string,
  teamAName: string,
  teamBName: string
): 'A' | 'B' | null => {
  const normalizedPosture = normalizeDashboardText(postura);
  const normalizedTeamA = normalizeDashboardText(teamAName);
  const normalizedTeamB = normalizeDashboardText(teamBName);

  if (
    normalizedPosture.includes('favor') ||
    normalizedPosture === normalizedTeamA ||
    normalizedPosture.includes(normalizedTeamA)
  ) {
    return 'A';
  }

  if (
    normalizedPosture.includes('contra') ||
    normalizedPosture === normalizedTeamB ||
    normalizedPosture.includes(normalizedTeamB)
  ) {
    return 'B';
  }

  return null;
};

export const buildDurationLookup = (
  segments: ProjectSegment[] | undefined,
  teamAName: string,
  teamBName: string
) => {
  const lookup = new Map<string, number | null>();

  (segments || []).forEach((segment) => {
    const team = getTeamFromPosture(segment.postura, teamAName, teamBName);
    if (!team) return;

    const key = getDashboardSlotKey(segment.fase_nombre, team);
    lookup.set(key, segment.duration_seconds ?? null);
  });

  return lookup;
};

export const mergeCriteriaNotes = (results: AnalysisResult[]): DashboardCriterionItem[] => {
  const merged = new Map<string, DashboardCriterionItem>();

  results.forEach((result) => {
    result.criterios.forEach((criterio, index) => {
      const key = normalizeDashboardText(`${criterio.criterio}-${index}`);
      if (merged.has(key)) return;

      merged.set(key, {
        id: key,
        label: criterio.criterio,
        note: criterio.anotacion,
      });
    });
  });

  return Array.from(merged.values());
};

export const getPhaseSequence = (debateType: string) =>
  debateType === 'retor'
    ? ['Contextualización', 'Definición', 'Valoración', 'Conclusión']
    : ['Introducción', 'Primer Refutador', 'Segundo Refutador', 'Conclusión'];
