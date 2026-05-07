import React, { useMemo } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  X,
} from 'lucide-react';
import { LiquidGlassButton } from './LiquidGlassButton';
import {
  averageScore,
  DashboardCriterionItem,
  DashboardSlot,
  DashboardSlotStatus,
  formatDashboardDuration,
  scoreTo40,
} from '../../utils/dashboardViewModel';
import { DashboardShareState } from '../../hooks/useDashboardShareLink';

interface EmbeddedDebateDashboardProps {
  slots: DashboardSlot[];
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  selectedSlotKey: string | null;
  onSelectSlot: (key: string) => void;
  onClearSelectedSlot: () => void;
  criteria: DashboardCriterionItem[];
  selectedCriterionId: string | null;
  onSelectCriterion: (criterionId: string) => void;
  shareLabel: string;
  shareState: DashboardShareState;
  onShare: () => void;
  onCopyShare: () => void;
  onOpenShare: () => void;
  onDismissShare: () => void;
}

const statusMeta: Record<
  DashboardSlotStatus,
  { label: string; border: string; fill: string; text: string }
> = {
  pending: {
    label: 'Pendiente',
    border: '#B8B8B6',
    fill: '#D5D5D3',
    text: '#6F6F6C',
  },
  recording: {
    label: 'Grabando',
    border: '#E6C068',
    fill: '#E6C068',
    text: '#8C6B15',
  },
  analyzing: {
    label: 'Analizando',
    border: '#D4A017',
    fill: '#F0D36A',
    text: '#8A6A10',
  },
  analyzed: {
    label: 'Analizado',
    border: '#3A7D44',
    fill: '#3A7D44',
    text: '#2E6A37',
  },
};

const getSlotColor = (slot: DashboardSlot, teamAColor: string, teamBColor: string) =>
  slot.team === 'A' ? teamAColor : teamBColor;

const getSlotFallbackMessage = (slot: DashboardSlot | null) => {
  if (!slot) return 'Selecciona una intervención para ver su contexto.';

  switch (slot.status) {
    case 'recording':
      return 'Esta intervención se está grabando ahora mismo.';
    case 'analyzing':
      return 'El análisis sigue en curso. El contexto aparecerá en cuanto termine.';
    case 'analyzed':
      return 'Esta intervención no tiene anotaciones adicionales para el criterio seleccionado.';
    case 'pending':
    default:
      return 'Esta intervención todavía no tiene análisis disponible.';
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const polarPoint = (cx: number, cy: number, radius: number, angle: number) => {
  const radians = (Math.PI * 2 * angle) - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
};

const buildRadarPath = (values: number[], radius: number) =>
  values
    .map((value, index) => {
      const point = polarPoint(70, 70, radius * clamp(value / 10, 0.04, 1), index / values.length);
      return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(' ') + ' Z';

const getCriterionAverages = (results: DashboardSlot['results']) => {
  const totals = new Map<string, { total: number; count: number }>();

  results.forEach((result) => {
    result.criterios.forEach((criterion) => {
      const current = totals.get(criterion.criterio) || { total: 0, count: 0 };
      totals.set(criterion.criterio, {
        total: current.total + criterion.nota,
        count: current.count + 1,
      });
    });
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      value: value.total / Math.max(1, value.count),
    }))
    .slice(0, 6);
};

const getSlotMetrics = (slot: DashboardSlot | null) => {
  const metrics = (slot?.segments || []).flatMap((segment) => {
    const source = segment.metrics_raw && Object.keys(segment.metrics_raw).length > 0
      ? segment.metrics_raw
      : segment.metrics_summary;

    return Object.values(source || {});
  });

  const getAverage = (keys: string[]) => {
    const values = metrics.flatMap((item) =>
      keys
        .map((key) => item?.[key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    );

    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return [
    {
      label: 'Tono',
      value: getAverage(['F0semitoneFrom27.5Hz_sma3nz_stddevNorm']),
      max: 0.3,
    },
    {
      label: 'Proyección',
      value: getAverage(['loudness_sma3_amean']),
      max: 2,
    },
    {
      label: 'Énfasis',
      value: getAverage(['loudness_sma3_stddevNorm', 'loudnessPeaksPerSec']),
      max: 3,
    },
    {
      label: 'Ritmo',
      value: getAverage(['VoicedSegmentsPerSec']),
      max: 2.5,
    },
  ];
};

export const EmbeddedDebateDashboard: React.FC<EmbeddedDebateDashboardProps> = ({
  slots,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  selectedSlotKey,
  onSelectSlot,
  onClearSelectedSlot,
  criteria,
  selectedCriterionId,
  onSelectCriterion,
  shareLabel,
  shareState,
  onShare,
  onCopyShare,
  onOpenShare,
  onDismissShare,
}) => {
  const teamASlots = useMemo(() => slots.filter((slot) => slot.team === 'A'), [slots]);
  const teamBSlots = useMemo(() => slots.filter((slot) => slot.team === 'B'), [slots]);

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.key === selectedSlotKey) || null,
    [slots, selectedSlotKey]
  );

  const peerSlot = useMemo(() => {
    if (!selectedSlot) return null;

    return (
      slots.find(
        (slot) =>
          slot.phase === selectedSlot.phase &&
          slot.team !== selectedSlot.team
      ) || null
    );
  }, [selectedSlot, slots]);

  const selectedCriterion = useMemo(
    () => criteria.find((criterion) => criterion.id === selectedCriterionId) || null,
    [criteria, selectedCriterionId]
  );

  const teamAResults = useMemo(
    () => teamASlots.flatMap((slot) => slot.results),
    [teamASlots]
  );
  const teamBResults = useMemo(
    () => teamBSlots.flatMap((slot) => slot.results),
    [teamBSlots]
  );

  const teamAScore40 = scoreTo40(averageScore(teamAResults));
  const teamBScore40 = scoreTo40(averageScore(teamBResults));
  const teamAAverage = averageScore(teamAResults);
  const teamBAverage = averageScore(teamBResults);
  const analyzedSlots = slots.filter((slot) => slot.status === 'analyzed');
  const durationValues = analyzedSlots
    .map((slot) => slot.durationSeconds)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  const averageDuration = durationValues.length
    ? durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length
    : null;
  const debateLeader =
    teamAAverage === teamBAverage
      ? 'Empate técnico'
      : teamAAverage > teamBAverage
        ? teamAName
        : teamBName;

  const selectedTeamAScore40 = scoreTo40(averageScore(
    [selectedSlot, peerSlot]
      .filter((slot): slot is DashboardSlot => Boolean(slot))
      .filter((slot) => slot.team === 'A')
      .flatMap((slot) => slot.results)
  ));
  const selectedTeamBScore40 = scoreTo40(averageScore(
    [selectedSlot, peerSlot]
      .filter((slot): slot is DashboardSlot => Boolean(slot))
      .filter((slot) => slot.team === 'B')
      .flatMap((slot) => slot.results)
  ));

  const chartPoints = useMemo(
    () =>
      slots.map((slot, index) => {
        const x = 26 + index * (slots.length > 1 ? 108 / (slots.length - 1) : 0);
        const y = 120 - clamp(slot.avg * 1.04, 10, 102);
        return { ...slot, x, y };
      }),
    [slots]
  );

  const teamAPath = chartPoints
    .filter((point) => point.team === 'A')
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const teamBPath = chartPoints
    .filter((point) => point.team === 'B')
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const selectedCriterionAverages = getCriterionAverages(selectedSlot?.results || []);
  const selectedRadarValues = selectedCriterionAverages.map((criterion) => criterion.value);
  const selectedMetricProfile = getSlotMetrics(selectedSlot);

  const detailContextOpen = Boolean(selectedCriterion);
  const selectedTeamColor = selectedSlot
    ? getSlotColor(selectedSlot, teamAColor, teamBColor)
    : teamAColor;

  return (
    <div
      className="relative overflow-hidden rounded-[24px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] p-4 sm:p-5"
      style={{
        height: 'clamp(32rem, calc(100dvh - 18rem), 42rem)',
      }}
    >
      <div
        className={`absolute inset-4 transition-all duration-300 ease-out ${
          selectedSlot
            ? 'pointer-events-none -translate-x-[6%] opacity-0'
            : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="grid h-full gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_250px]">
          <div className="rounded-[22px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">{teamAName}</p>
                  <p className="text-[30px] leading-none text-[#2C2C2C]">Marcador total</p>
                  <div className="mt-2 h-2 w-36 rounded-full bg-[#E7E7E4]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${clamp(teamAAverage, 0, 100)}%`, background: teamAColor }}
                    />
                  </div>
                </div>
                <span
                  className="rounded-2xl px-4 py-2 text-[34px] leading-none text-white"
                  style={{ background: teamAColor }}
                >
                  {teamAScore40}
                  <span className="text-base opacity-80">/40</span>
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">{teamBName}</p>
                  <p className="text-[30px] leading-none text-[#2C2C2C]">Marcador total</p>
                  <div className="mt-2 h-2 w-36 rounded-full bg-[#E7E7E4]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${clamp(teamBAverage, 0, 100)}%`, background: teamBColor }}
                    />
                  </div>
                </div>
                <span
                  className="rounded-2xl px-4 py-2 text-[34px] leading-none text-white"
                  style={{ background: teamBColor }}
                >
                  {teamBScore40}
                  <span className="text-base opacity-80">/40</span>
                </span>
              </div>

              <div className="rounded-2xl bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">Lectura rápida</p>
                    <p className="text-[30px] leading-none text-[#2C2C2C]">{debateLeader}</p>
                    <p className="mt-1 text-sm text-[#2C2C2C]/55">
                      {analyzedSlots.length}/{slots.length} intervenciones · media {formatDashboardDuration(averageDuration)}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2 text-xs text-[#2C2C2C]/65">
                    {(['pending', 'recording', 'analyzing', 'analyzed'] as DashboardSlotStatus[]).map((status) => (
                      <span key={status} className="inline-flex items-center gap-1 rounded-full bg-[#F3F3F1] px-2 py-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: statusMeta[status].fill }}
                        />
                        {statusMeta[status].label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[22px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-4">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">Puntos</p>
                  <p className="text-[30px] leading-none text-[#2C2C2C]">Pulso del debate</p>
                </div>
                <p className="text-sm text-[#2C2C2C]/55">Fase a fase</p>
              </div>

              <div className="mt-4 flex-1 rounded-[20px] bg-white px-4 py-3">
                <svg viewBox="0 0 160 132" className="h-full w-full">
                  <line x1="18" y1="10" x2="18" y2="122" stroke="#2C2C2C" strokeWidth="2" />
                  <line x1="18" y1="122" x2="146" y2="122" stroke="#2C2C2C" strokeWidth="2" />
                  {[26, 50, 74, 98].map((y) => (
                    <line
                      key={`grid-${y}`}
                      x1="18"
                      y1={y}
                      x2="146"
                      y2={y}
                      stroke="#2C2C2C"
                      strokeOpacity="0.08"
                      strokeWidth="1"
                    />
                  ))}
                  {teamAPath && (
                    <path d={teamAPath} fill="none" stroke={teamAColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {teamBPath && (
                    <path d={teamBPath} fill="none" stroke={teamBColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  )}
                  {chartPoints.map((point) => {
                    const fill = getSlotColor(point, teamAColor, teamBColor);
                    return (
                      <g key={`chart-${point.key}`}>
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={point.x}
                          y2="122"
                          stroke={fill}
                          strokeOpacity="0.14"
                          strokeWidth="2"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={point.isCurrent ? 6 : 5}
                          fill={fill}
                          opacity={point.status === 'pending' ? 0.28 : 1}
                        />
                        {point.status === 'recording' && (
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="9"
                            fill="none"
                            stroke={fill}
                            strokeWidth="2"
                            strokeOpacity="0.38"
                          />
                        )}
                      </g>
                    );
                  })}
                  <text x="22" y="19" fill="#2C2C2C" fontSize="7" opacity="0.48">100</text>
                  <text x="22" y="118" fill="#2C2C2C" fontSize="7" opacity="0.48">0</text>
                </svg>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-center text-[16px] leading-none text-[#2C2C2C]">
                <span className="rounded-full bg-white py-2" style={{ color: teamAColor }}>{teamAName}</span>
                <span className="rounded-full bg-white py-2" style={{ color: teamBColor }}>{teamBName}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onShare}
            className="rounded-[22px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-4 text-left text-[#2C2C2C] transition-transform hover:scale-[1.01]"
          >
            <div className="flex h-full flex-col justify-between">
              <div>
                <div className="mb-3 inline-flex rounded-full bg-white px-3 py-1.5 text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">
                  Compartir
                </div>
                <p className="text-[34px] leading-tight">{shareLabel}</p>
                <p className="mt-3 text-sm text-[#2C2C2C]/65">
                  Genera un enlace nuevo cada vez para compartir el estado actual.
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
                {shareState.status === 'loading' ? (
                  <>
                    <span className="text-sm text-[#2C2C2C]/70">Generando enlace...</span>
                    <Loader2 className="h-5 w-5 animate-spin text-[#2C2C2C]" />
                  </>
                ) : (
                  <>
                    <span className="text-sm text-[#2C2C2C]/70">Abrir opciones</span>
                    <Link2 className="h-5 w-5 text-[#2C2C2C]" />
                  </>
                )}
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 rounded-[22px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-4">
          <div className="grid grid-cols-4 gap-2">
            {teamASlots.map((slot) => {
              const slotColor = getSlotColor(slot, teamAColor, teamBColor);
              return (
                <button
                  key={`top-${slot.key}`}
                  type="button"
                  onClick={() => slot.isSelectable !== false && onSelectSlot(slot.key)}
                  className="rounded-[16px] px-3 py-3 text-left text-white transition-transform hover:scale-[1.01] disabled:cursor-default"
                  style={{
                    background: slot.isSelectable === false ? '#DADADA' : slotColor,
                    opacity: slot.isSelectable === false ? 0.48 : 1,
                  }}
                  disabled={slot.isSelectable === false}
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/70">{teamAName}</p>
                  <p className="mt-1 text-[22px] leading-none">{slot.phase}</p>
                </button>
              );
            })}
          </div>

          <div className="relative mt-5 px-1">
            <div className="h-[4px] w-full rounded-full bg-[#2C2C2C]" />
            <div className="absolute inset-x-1 top-[-12px] flex items-center justify-between">
              {slots.map((slot) => {
                const meta = statusMeta[slot.status];
                const slotColor = getSlotColor(slot, teamAColor, teamBColor);

                return (
                  <button
                    key={`dot-${slot.key}`}
                    type="button"
                    onClick={() => slot.isSelectable !== false && onSelectSlot(slot.key)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-[3px] bg-[#F0F0EE] transition-transform hover:scale-110 disabled:cursor-default"
                    style={{
                      borderColor: slot.status === 'recording' ? slotColor : meta.border,
                      boxShadow: slot.isCurrent ? '0 0 0 4px rgba(230, 192, 104, 0.2)' : 'none',
                    }}
                    title={meta.label}
                    disabled={slot.isSelectable === false}
                  >
                    {slot.status === 'analyzed' ? (
                      <Check className="h-4 w-4 text-[#3A7D44]" />
                    ) : slot.status === 'analyzing' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#8A6A10]" />
                    ) : slot.status === 'recording' ? (
                      <span
                        className="h-3.5 w-3.5 animate-pulse rounded-full"
                        style={{ background: slotColor }}
                      />
                    ) : (
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ background: meta.fill }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-2">
            {teamBSlots.map((slot) => {
              const slotColor = getSlotColor(slot, teamAColor, teamBColor);
              return (
                <button
                  key={`bottom-${slot.key}`}
                  type="button"
                  onClick={() => slot.isSelectable !== false && onSelectSlot(slot.key)}
                  className="rounded-[16px] px-3 py-3 text-left text-white transition-transform hover:scale-[1.01] disabled:cursor-default"
                  style={{
                    background: slot.isSelectable === false ? '#DADADA' : slotColor,
                    opacity: slot.isSelectable === false ? 0.48 : 1,
                  }}
                  disabled={slot.isSelectable === false}
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-white/70">{teamBName}</p>
                  <p className="mt-1 text-[22px] leading-none">{slot.phase}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className={`absolute inset-4 transition-all duration-300 ease-out ${
          selectedSlot
            ? 'translate-x-0 opacity-100'
            : 'pointer-events-none translate-x-[6%] opacity-0'
        }`}
      >
        {selectedSlot && (
          <div className="flex h-full flex-col rounded-[24px] px-4 py-4 text-white" style={{ background: selectedTeamColor }}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClearSelectedSlot}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/18"
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <div>
                  <p className="text-sm uppercase tracking-[0.12em] text-white/75">
                    {selectedSlot.team === 'A' ? teamAName : teamBName}
                  </p>
                  <h3 className="text-[44px] leading-none sm:text-[54px]">{selectedSlot.phase}</h3>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1.5 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: statusMeta[selectedSlot.status].fill }}
                />
                {statusMeta[selectedSlot.status].label}
              </div>
            </div>

            <div
              className={`grid min-h-0 flex-1 gap-3 ${
                detailContextOpen
                  ? 'lg:grid-cols-[0.95fr_1.05fr_0.95fr]'
                  : 'lg:grid-cols-[0.95fr_1.55fr]'
              }`}
            >
              <div className="grid min-h-0 grid-cols-2 gap-3 overflow-y-auto pr-1">
                <div className="rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                  <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/58">{teamAName}</p>
                  <p className="mt-2 text-[54px] leading-none">
                    {selectedTeamAScore40}
                    <span className="text-[24px] opacity-60">/40</span>
                  </p>
                </div>
                <div className="rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                  <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/58">{teamBName}</p>
                  <p className="mt-2 text-[54px] leading-none">
                    {selectedTeamBScore40}
                    <span className="text-[24px] opacity-60">/40</span>
                  </p>
                </div>
                <div className="rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                  <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/58">Duración real</p>
                  <p className="mt-2 text-[46px] leading-none">{formatDashboardDuration(selectedSlot.durationSeconds)}</p>
                </div>
                <div className="rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                  <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/58">Energía</p>
                  <div className="mt-2 flex items-center gap-3">
                    <svg viewBox="0 0 72 72" className="h-16 w-16 shrink-0">
                      <circle cx="36" cy="36" r="28" fill="none" stroke="#ECECE9" strokeWidth="10" />
                      <circle
                        cx="36"
                        cy="36"
                        r="28"
                        fill="none"
                        stroke={selectedTeamColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${clamp(selectedSlot.avg, 0, 100) * 1.76} 176`}
                        transform="rotate(-90 36 36)"
                      />
                    </svg>
                    <p className="text-[46px] leading-none">{Math.round(selectedSlot.avg || 0)}</p>
                  </div>
                </div>

                <div className="col-span-2 rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/58">Radar de rúbrica</p>
                    <span className="text-sm text-[#2C2C2C]/50">{selectedCriterionAverages.length || 0} criterios</span>
                  </div>
                  {selectedCriterionAverages.length >= 3 ? (
                    <div className="mt-2 grid grid-cols-[140px_minmax(0,1fr)] gap-3">
                      <svg viewBox="0 0 140 140" className="h-[140px] w-[140px]">
                        {[22, 40, 58].map((radius) => (
                          <polygon
                            key={`radar-grid-${radius}`}
                            points={selectedRadarValues
                              .map((_, index) => {
                                const point = polarPoint(70, 70, radius, index / selectedRadarValues.length);
                                return `${point.x},${point.y}`;
                              })
                              .join(' ')}
                            fill="none"
                            stroke="#2C2C2C"
                            strokeOpacity="0.12"
                          />
                        ))}
                        <path d={buildRadarPath(selectedRadarValues, 58)} fill={selectedTeamColor} fillOpacity="0.22" stroke={selectedTeamColor} strokeWidth="3" />
                        {selectedRadarValues.map((value, index) => {
                          const point = polarPoint(70, 70, 58 * clamp(value / 10, 0.04, 1), index / selectedRadarValues.length);
                          return <circle key={`radar-point-${index}`} cx={point.x} cy={point.y} r="3.5" fill={selectedTeamColor} />;
                        })}
                      </svg>
                      <div className="min-w-0 space-y-2 self-center">
                        {selectedCriterionAverages.slice(0, 4).map((criterion) => (
                          <div key={`radar-label-${criterion.label}`}>
                            <div className="mb-1 flex justify-between gap-2 text-sm text-[#2C2C2C]/65">
                              <span className="truncate">{criterion.label}</span>
                              <span>{criterion.value.toFixed(1)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-[#ECECE9]">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${clamp(criterion.value * 10, 0, 100)}%`, background: selectedTeamColor }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-[20px] leading-snug text-[#2C2C2C]/58">
                      El radar aparecerá cuando haya al menos tres criterios puntuados.
                    </p>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectedMetricProfile.map((metric) => {
                      const percent =
                        typeof metric.value === 'number'
                          ? clamp((metric.value / metric.max) * 100, 4, 100)
                          : 0;

                      return (
                        <div key={`metric-${metric.label}`} className="rounded-[14px] bg-[#F3F3F1] px-3 py-2">
                          <div className="mb-1 flex justify-between gap-2 text-xs uppercase tracking-[0.08em] text-[#2C2C2C]/50">
                            <span>{metric.label}</span>
                            <span>{typeof metric.value === 'number' ? metric.value.toFixed(2) : 'N/A'}</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percent}%`, background: selectedTeamColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="min-h-0 rounded-[20px] bg-white p-3 text-[#1C1D1F]">
                {criteria.length > 0 ? (
                  <div className="h-full overflow-y-auto pr-1">
                    <div className="space-y-1.5">
                      {criteria.map((criterion) => {
                        const active = criterion.id === selectedCriterionId;
                        return (
                          <button
                            key={criterion.id}
                            type="button"
                            onClick={() => onSelectCriterion(criterion.id)}
                            className="flex w-full items-center justify-between rounded-[16px] px-3 py-3 text-left transition-colors"
                            style={{ background: active ? '#F1F1F0' : 'transparent' }}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[22px] leading-snug">{criterion.label}</span>
                              <span className="mt-2 block h-2 rounded-full bg-[#ECECE9]">
                                <span
                                  className="block h-full rounded-full"
                                  style={{
                                    width: `${clamp((selectedCriterionAverages.find((item) => item.label === criterion.label)?.value || 0) * 10, 0, 100)}%`,
                                    background: selectedTeamColor,
                                  }}
                                />
                              </span>
                            </span>
                            <ChevronRight
                              className={`h-5 w-5 shrink-0 transition-transform ${
                                active ? 'rotate-90' : ''
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[22px] leading-snug text-[#2C2C2C]/65">
                    {getSlotFallbackMessage(selectedSlot)}
                  </div>
                )}
              </div>

              {detailContextOpen && (
                <div className="rounded-[20px] bg-white p-4 text-[#2C2C2C]">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[18px] uppercase tracking-[0.1em] text-[#2C2C2C]/55">Contexto de rúbrica</p>
                    <button
                      type="button"
                      onClick={() => selectedCriterion && onSelectCriterion(selectedCriterion.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F1F0] text-[#2C2C2C]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-[22px] leading-relaxed">
                    {selectedCriterion?.note || getSlotFallbackMessage(selectedSlot)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {shareState.status !== 'idle' && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-30 w-[min(380px,calc(100%-2rem))]">
          <div className="pointer-events-auto rounded-[22px] border border-[#1C1D1F]/12 bg-white p-4 text-[#2C2C2C] shadow-[0_18px_40px_rgba(28,29,31,0.14)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">
                  {shareState.status === 'error' ? 'Error al compartir' : 'Dashboard listo'}
                </p>
                <p className="mt-1 text-[18px] leading-snug">{shareState.message}</p>
              </div>
              <button
                type="button"
                onClick={onDismissShare}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#F1F1F0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {shareState.status === 'success' && shareState.url && (
              <div className="mt-4 flex flex-wrap gap-2">
                <LiquidGlassButton
                  onClick={onCopyShare}
                  variant="secondary"
                  className="rounded-[14px] border border-[#2C2C2C]/12 bg-[#ECECE9] px-4 py-2 text-[#2C2C2C]"
                >
                  <Copy className="h-4 w-4" />
                  Copiar enlace
                </LiquidGlassButton>
                <LiquidGlassButton
                  onClick={onOpenShare}
                  variant="secondary"
                  className="rounded-[14px] border border-[#2C2C2C]/12 bg-[#ECECE9] px-4 py-2 text-[#2C2C2C]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir
                </LiquidGlassButton>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddedDebateDashboard;
