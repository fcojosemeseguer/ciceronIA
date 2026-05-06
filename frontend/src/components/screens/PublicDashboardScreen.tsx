import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCcw } from 'lucide-react';
import { dashboardService } from '../../api';
import { ProjectSegment, PublicDashboardResponse } from '../../types';
import { LiquidGlassButton } from '../common';

interface PublicDashboardScreenProps {
  token: string;
  onBack?: () => void;
}

const formatPercent = (value: number) => `${Math.round(value)}%`;

interface MetricMeta {
  label: string;
  description: string;
  typicalRange: string;
  goodHint: string;
  badHint: string;
  evaluate: (value: number) => 'good' | 'neutral' | 'bad';
}

const METRIC_META: Record<string, MetricMeta> = {
  'F0semitoneFrom27.5Hz_sma3nz_stddevNorm': {
    label: 'Expresividad tonal',
    description: 'Variación del tono de voz. Más alto suele indicar mayor expresividad.',
    typicalRange: '0.08 - 0.30',
    goodHint: 'Suele ser positivo un rango medio-alto (expresividad).',
    badHint: 'Muy bajo: voz plana. Muy alto: posible inestabilidad.',
    evaluate: (v) => (v >= 0.10 && v <= 0.25 ? 'good' : v < 0.07 || v > 0.35 ? 'bad' : 'neutral'),
  },
  'loudness_sma3_amean': {
    label: 'Proyección media',
    description: 'Intensidad promedio de la voz (volumen percibido).',
    typicalRange: '0.80 - 2.00',
    goodHint: 'Rango medio suele percibirse como buena proyección.',
    badHint: 'Muy bajo: poca presencia. Muy alto: puede sonar forzado.',
    evaluate: (v) => (v >= 1.0 && v <= 1.8 ? 'good' : v < 0.6 || v > 2.3 ? 'bad' : 'neutral'),
  },
  'loudness_sma3_stddevNorm': {
    label: 'Énfasis',
    description: 'Variación de volumen. Relacionada con la capacidad de enfatizar ideas.',
    typicalRange: '0.40 - 1.20',
    goodHint: 'Un rango medio refleja énfasis sin exceso.',
    badHint: 'Muy bajo: monótono. Muy alto: irregular.',
    evaluate: (v) => (v >= 0.5 && v <= 1.0 ? 'good' : v < 0.25 || v > 1.4 ? 'bad' : 'neutral'),
  },
  'loudnessPeaksPerSec': {
    label: 'Picos de energía/seg',
    description: 'Cantidad de picos de intensidad por segundo.',
    typicalRange: '2.00 - 5.00',
    goodHint: 'Valores medios suelen indicar dinamismo controlado.',
    badHint: 'Muy bajo: plano. Muy alto: precipitado/sobreactuado.',
    evaluate: (v) => (v >= 2.5 && v <= 4.5 ? 'good' : v < 1.5 || v > 6.0 ? 'bad' : 'neutral'),
  },
  'VoicedSegmentsPerSec': {
    label: 'Ritmo vocal',
    description: 'Frecuencia de segmentos vocalizados por segundo.',
    typicalRange: '1.00 - 2.50',
    goodHint: 'Rango medio sugiere ritmo estable.',
    badHint: 'Muy bajo: pausado en exceso. Muy alto: ritmo atropellado.',
    evaluate: (v) => (v >= 1.2 && v <= 2.2 ? 'good' : v < 0.8 || v > 2.8 ? 'bad' : 'neutral'),
  },
  'MeanUnvoicedSegmentLength': {
    label: 'Silencios medios',
    description: 'Duración media de pausas no vocalizadas.',
    typicalRange: '0.05 - 0.20',
    goodHint: 'Pausas cortas/medias suelen ayudar a estructurar.',
    badHint: 'Muy bajo: sin pausas. Muy alto: pérdida de fluidez.',
    evaluate: (v) => (v >= 0.06 && v <= 0.16 ? 'good' : v < 0.03 || v > 0.25 ? 'bad' : 'neutral'),
  },
  'jitterLocal_sma3nz_amean': {
    label: 'Jitter (estabilidad)',
    description: 'Variación ciclo a ciclo de frecuencia. Más alto puede indicar menor estabilidad.',
    typicalRange: '0.010 - 0.050',
    goodHint: 'Más bajo suele asociarse a mayor estabilidad vocal.',
    badHint: 'Valores altos pueden reflejar tensión/inestabilidad.',
    evaluate: (v) => (v <= 0.035 ? 'good' : v > 0.06 ? 'bad' : 'neutral'),
  },
  'shimmerLocaldB_sma3nz_amean': {
    label: 'Shimmer (estabilidad)',
    description: 'Variación ciclo a ciclo de amplitud. Más alto puede indicar menor estabilidad.',
    typicalRange: '0.50 - 1.60',
    goodHint: 'Más bajo suele asociarse a mayor control vocal.',
    badHint: 'Valores altos pueden reflejar fatiga/inestabilidad.',
    evaluate: (v) => (v <= 1.25 ? 'good' : v > 1.8 ? 'bad' : 'neutral'),
  },
};

const metricOrder = Object.keys(METRIC_META);

const sortScoreBuckets = (buckets: Record<string, { avg_score_percent: number; count: number }>) =>
  Object.entries(buckets)
    .map(([label, value]) => ({ label, ...value }))
    .sort((a, b) => b.avg_score_percent - a.avg_score_percent);

const getCriterionDashboard = (segments: ProjectSegment[]) => {
  const totals = new Map<string, { total: number; count: number }>();

  segments.forEach((segment) => {
    segment.analysis?.criterios?.forEach((criterion) => {
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
      avg: value.total / Math.max(1, value.count),
      count: value.count,
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);
};

const getVisualMetricDashboard = (segments: ProjectSegment[]) => {
  const metricGroups = segments.flatMap((segment) => Object.values(renderMetricsBySpeaker(segment)));

  const averageMetric = (keys: string[]) => {
    const values = metricGroups.flatMap((metrics) =>
      keys
        .map((key) => metrics?.[key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    );

    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return [
    { label: 'Expresividad', value: averageMetric(['F0semitoneFrom27.5Hz_sma3nz_stddevNorm']), max: 0.3 },
    { label: 'Proyección', value: averageMetric(['loudness_sma3_amean']), max: 2 },
    { label: 'Énfasis', value: averageMetric(['loudness_sma3_stddevNorm', 'loudnessPeaksPerSec']), max: 3 },
    { label: 'Ritmo', value: averageMetric(['VoicedSegmentsPerSec']), max: 2.5 },
  ];
};

const formatMetricValue = (value: unknown): string => {
  if (typeof value === 'number') {
    return value.toFixed(4);
  }
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }
  return String(value);
};

const renderTranscriptRaw = (segment: ProjectSegment): string => {
  if (segment.transcript && Array.isArray(segment.transcript) && segment.transcript.length > 0) {
    return segment.transcript
      .map((item) => {
        const start = typeof item?.start === 'number' ? item.start.toFixed(2) : '0.00';
        const end = typeof item?.end === 'number' ? item.end.toFixed(2) : '0.00';
        const speaker = item?.speaker || 'SPEAKER';
        const text = item?.text || '';
        return `[${start}s - ${end}s] ${speaker}: ${text}`;
      })
      .join('\n');
  }

  return segment.transcript_preview || 'Sin transcripción disponible';
};

const renderTranscriptClean = (segment: ProjectSegment): string => {
  if (segment.transcript && Array.isArray(segment.transcript) && segment.transcript.length > 0) {
    const grouped: Array<{ speaker: string; text: string }> = [];
    for (const item of segment.transcript) {
      const speaker = item?.speaker || 'SPEAKER';
      const text = String(item?.text || '').trim();
      if (!text) {
        continue;
      }

      const last = grouped[grouped.length - 1];
      if (last && last.speaker === speaker) {
        last.text = `${last.text} ${text}`.replace(/\s+/g, ' ').trim();
      } else {
        grouped.push({ speaker, text });
      }
    }

    if (grouped.length === 0) {
      return 'Sin transcripción disponible';
    }

    return grouped
      .map((block) => `${block.speaker}: ${block.text}`)
      .join('\n\n');
  }

  return segment.transcript_preview || 'Sin transcripción disponible';
};

const renderMetricsBySpeaker = (segment: ProjectSegment): Record<string, Record<string, unknown>> => {
  if (segment.metrics_raw && Object.keys(segment.metrics_raw).length > 0) {
    return segment.metrics_raw;
  }
  return segment.metrics_summary || {};
};

export const PublicDashboardScreen: React.FC<PublicDashboardScreenProps> = ({ token, onBack }) => {
  const [data, setData] = useState<PublicDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fase, setFase] = useState('');
  const [postura, setPostura] = useState('');
  const [orador, setOrador] = useState('');
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [expandedTranscripts, setExpandedTranscripts] = useState<Record<string, boolean>>({});
  const [rawTranscriptMode, setRawTranscriptMode] = useState<Record<string, boolean>>({});

  const loadDashboard = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await dashboardService.getPublicDashboard(token, {
        fase: fase || undefined,
        postura: postura || undefined,
        orador: orador || undefined,
        limit,
        offset,
      });
      setData(response);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError('Enlace no encontrado (404).');
      } else if (status === 410) {
        setError('Este enlace ha caducado o fue revocado (410).');
      } else if (status === 429) {
        setError('Demasiadas solicitudes (429). Espera unos segundos e inténtalo de nuevo.');
      } else {
        setError(err?.response?.data?.detail || 'No se pudo cargar el dashboard público.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, offset, limit]);

  const canGoPrev = offset > 0;
  const canGoNext = !!data && offset + limit < data.segments.total;

  const faseOptions = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.summary.score_by_fase);
  }, [data]);

  const posturaOptions = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.summary.score_by_postura);
  }, [data]);

  const oradorOptions = useMemo(() => {
    if (!data) return [];
    return Object.keys(data.summary.score_by_orador);
  }, [data]);

  const scoreByPhase = useMemo(
    () => (data ? sortScoreBuckets(data.summary.score_by_fase) : []),
    [data]
  );
  const scoreByPosture = useMemo(
    () => (data ? sortScoreBuckets(data.summary.score_by_postura) : []),
    [data]
  );
  const scoreBySpeaker = useMemo(
    () => (data ? sortScoreBuckets(data.summary.score_by_orador).slice(0, 6) : []),
    [data]
  );
  const criterionDashboard = useMemo(
    () => (data ? getCriterionDashboard(data.segments.items) : []),
    [data]
  );
  const visualMetricDashboard = useMemo(
    () => (data ? getVisualMetricDashboard(data.segments.items) : []),
    [data]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-20">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
            )}
            <h1 className="text-2xl font-bold text-white">Dashboard Compartido</h1>
            <div className="ml-auto">
              <LiquidGlassButton onClick={loadDashboard} variant="secondary" className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4" />
                Recargar
              </LiquidGlassButton>
            </div>
          </div>

          {isLoading && (
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white/70">
              Cargando dashboard...
            </div>
          )}

          {error && !isLoading && (
            <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-start gap-3 mb-6">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              <div className="mb-6 p-6 rounded-2xl bg-white/5 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-1">
                  {data.project.debate_topic || data.project.name}
                </h2>
                <p className="text-white/60 text-sm">
                  {data.project.team_a_name || 'Equipo A'} vs {data.project.team_b_name || 'Equipo B'} · {data.project.debate_type}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/50 text-sm">Segmentos</p>
                  <p className="text-white text-2xl font-bold">{data.summary.total_segments}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/50 text-sm">Media global</p>
                  <p className="text-white text-2xl font-bold">{formatPercent(data.summary.average_score_percent)}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/50 text-sm">Fases evaluadas</p>
                  <p className="text-white text-2xl font-bold">{Object.keys(data.summary.score_by_fase).length}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/50 text-sm">Oradores</p>
                  <p className="text-white text-2xl font-bold">{Object.keys(data.summary.score_by_orador).length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4 mb-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 overflow-hidden">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                    <div>
                      <p className="text-white/50 text-sm uppercase tracking-[0.14em]">Mapa competitivo</p>
                      <h2 className="text-white text-2xl font-bold">Puntuación por fases</h2>
                    </div>
                    <div className="rounded-full bg-cyan-400/10 border border-cyan-300/20 px-3 py-1 text-cyan-200 text-sm">
                      {formatPercent(data.summary.average_score_percent)} global
                    </div>
                  </div>

                  {scoreByPhase.length > 0 ? (
                    <div className="space-y-3">
                      {scoreByPhase.map((item) => (
                        <div key={`phase-chart-${item.label}`} className="grid grid-cols-[minmax(96px,160px)_1fr_58px] items-center gap-3">
                          <p className="text-white/75 text-sm truncate">{item.label}</p>
                          <div className="h-4 rounded-full bg-black/30 border border-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-emerald-300 to-yellow-200"
                              style={{ width: `${Math.min(100, Math.max(0, item.avg_score_percent))}%` }}
                            />
                          </div>
                          <p className="text-right text-cyan-100 font-bold">{formatPercent(item.avg_score_percent)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/55">Aún no hay fases puntuadas.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <p className="text-white/50 text-sm uppercase tracking-[0.14em] mb-1">Posturas</p>
                  <h2 className="text-white text-2xl font-bold mb-5">Comparativa visual</h2>
                  <div className="space-y-4">
                    {scoreByPosture.map((item) => (
                      <div key={`posture-chart-${item.label}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-white font-semibold">{item.label}</p>
                          <p className="text-[#00E5FF] text-xl font-bold">{formatPercent(item.avg_score_percent)}</p>
                        </div>
                        <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#00E5FF]"
                            style={{ width: `${Math.min(100, Math.max(0, item.avg_score_percent))}%` }}
                          />
                        </div>
                        <p className="mt-2 text-white/45 text-xs">{item.count} intervenciones</p>
                      </div>
                    ))}
                    {scoreByPosture.length === 0 && (
                      <p className="text-white/55">Sin comparativa disponible.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="rounded-2xl bg-white/5 border border-white/10 p-5 lg:col-span-2">
                  <p className="text-white/50 text-sm uppercase tracking-[0.14em] mb-1">Rúbrica</p>
                  <h2 className="text-white text-2xl font-bold mb-5">Fortalezas por criterio</h2>
                  {criterionDashboard.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {criterionDashboard.map((criterion, index) => (
                        <div key={`criterion-visual-${criterion.label}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className="text-white/85 text-sm font-semibold truncate">{criterion.label}</p>
                            <p className="text-yellow-200 font-bold">{criterion.avg.toFixed(1)}</p>
                          </div>
                          <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, criterion.avg * 10))}%`,
                                background: index < 3 ? '#F8D66D' : '#00E5FF',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white/55">No hay criterios en los segmentos cargados.</p>
                  )}
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
                  <p className="text-white/50 text-sm uppercase tracking-[0.14em] mb-1">Prosodia</p>
                  <h2 className="text-white text-2xl font-bold mb-5">Perfil vocal</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {visualMetricDashboard.map((metric) => {
                      const percent =
                        typeof metric.value === 'number'
                          ? Math.min(100, Math.max(0, (metric.value / metric.max) * 100))
                          : 0;

                      return (
                        <div key={`metric-visual-${metric.label}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                          <svg viewBox="0 0 72 72" className="mx-auto h-20 w-20">
                            <circle cx="36" cy="36" r="28" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="9" />
                            <circle
                              cx="36"
                              cy="36"
                              r="28"
                              fill="none"
                              stroke="#00E5FF"
                              strokeWidth="9"
                              strokeLinecap="round"
                              strokeDasharray={`${percent * 1.76} 176`}
                              transform="rotate(-90 36 36)"
                            />
                          </svg>
                          <p className="text-white text-center text-sm font-semibold">{metric.label}</p>
                          <p className="text-white/50 text-center text-xs">
                            {typeof metric.value === 'number' ? metric.value.toFixed(2) : 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {scoreBySpeaker.length > 0 && (
                <div className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-5">
                  <p className="text-white/50 text-sm uppercase tracking-[0.14em] mb-1">Oradores</p>
                  <h2 className="text-white text-2xl font-bold mb-5">Ranking visual</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {scoreBySpeaker.map((speaker, index) => (
                      <div key={`speaker-ranking-${speaker.label}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-white/85 text-sm font-semibold truncate">{index + 1}. {speaker.label}</p>
                          <p className="text-[#00E5FF] font-bold">{formatPercent(speaker.avg_score_percent)}</p>
                        </div>
                        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#F8D66D]"
                            style={{ width: `${Math.min(100, Math.max(0, speaker.avg_score_percent))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <select
                    value={fase}
                    onChange={(e) => setFase(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  >
                    <option value="">Todas las fases</option>
                    {faseOptions.map((item) => (
                      <option key={item} value={item} className="bg-slate-900">{item}</option>
                    ))}
                  </select>

                  <select
                    value={postura}
                    onChange={(e) => setPostura(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  >
                    <option value="">Todas las posturas</option>
                    {posturaOptions.map((item) => (
                      <option key={item} value={item} className="bg-slate-900">{item}</option>
                    ))}
                  </select>

                  <select
                    value={orador}
                    onChange={(e) => setOrador(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  >
                    <option value="">Todos los oradores</option>
                    {oradorOptions.map((item) => (
                      <option key={item} value={item} className="bg-slate-900">{item}</option>
                    ))}
                  </select>

                  <select
                    value={limit}
                    onChange={(e) => {
                      setOffset(0);
                      setLimit(Number(e.target.value));
                    }}
                    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                  >
                    <option value={10} className="bg-slate-900">10</option>
                    <option value={20} className="bg-slate-900">20</option>
                    <option value={50} className="bg-slate-900">50</option>
                  </select>

                  <LiquidGlassButton
                    onClick={() => {
                      setOffset(0);
                      loadDashboard();
                    }}
                    className="w-full"
                  >
                    Aplicar filtros
                  </LiquidGlassButton>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                {data.segments.items.length === 0 && (
                  <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-white/60 text-center">
                    No hay segmentos para los filtros seleccionados.
                  </div>
                )}

                {data.segments.items.map((segment) => {
                  const speakerMetrics = renderMetricsBySpeaker(segment);
                  const transcriptExpanded = !!expandedTranscripts[segment.segment_id];
                  const isRawMode = !!rawTranscriptMode[segment.segment_id];
                  const transcriptText = isRawMode
                    ? renderTranscriptRaw(segment)
                    : renderTranscriptClean(segment);
                  const usesPreviewOnly =
                    (!segment.transcript || segment.transcript.length === 0) &&
                    !!segment.transcript_preview;
                  const looksTruncated =
                    usesPreviewOnly &&
                    typeof segment.transcript_preview === 'string' &&
                    segment.transcript_preview.trim().endsWith('...');
                  return (
                    <div key={segment.segment_id} className="p-5 rounded-2xl bg-white/5 border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div>
                          <p className="text-white font-semibold">{segment.fase_nombre} · {segment.postura}</p>
                          <p className="text-white/50 text-sm">{segment.orador} · {segment.duration_seconds ? `${Math.round(segment.duration_seconds)}s` : 'duración no disponible'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#00E5FF] text-xl font-bold">{segment.analysis.total}/{segment.analysis.max_total}</p>
                          <p className="text-white/50 text-sm">{formatPercent(segment.analysis.score_percent)}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-white/70 text-sm font-semibold mb-2">Puntuaciones por apartado</p>
                        {segment.analysis.criterios.length > 0 ? (
                          <div className="space-y-2">
                            {segment.analysis.criterios.map((criterio, idx) => (
                              <div key={`${segment.segment_id}-crit-${idx}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <p className="text-white text-sm font-medium">{criterio.criterio}</p>
                                  <p className="text-[#00E5FF] font-bold">{criterio.nota}</p>
                                </div>
                                {criterio.anotacion && (
                                  <p className="text-white/65 text-xs">{criterio.anotacion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-white/60 text-sm">Sin detalle por criterios.</p>
                        )}

                        {segment.analysis.recommendation && (
                          <div className="mt-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3">
                            <p className="text-cyan-200 text-xs font-semibold mb-1">Recomendación</p>
                            <p className="text-white/85 text-sm">{segment.analysis.recommendation}</p>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-white/70 text-sm font-semibold mb-2">Transcripción completa</p>
                        <pre className={`text-xs text-white/80 bg-black/30 rounded-xl p-3 whitespace-pre-wrap break-words overflow-hidden transition-all duration-300 ${transcriptExpanded ? 'max-h-[900px]' : 'max-h-32'}`}>
                          {transcriptText}
                        </pre>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <LiquidGlassButton
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setExpandedTranscripts((prev) => ({
                                  ...prev,
                                  [segment.segment_id]: !prev[segment.segment_id],
                                }))
                              }
                            >
                              {transcriptExpanded ? 'Contraer transcripción' : 'Expandir transcripción'}
                            </LiquidGlassButton>
                            <LiquidGlassButton
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setRawTranscriptMode((prev) => ({
                                  ...prev,
                                  [segment.segment_id]: !prev[segment.segment_id],
                                }))
                              }
                            >
                              {isRawMode ? 'Ver versión limpia' : 'Ver formato original'}
                            </LiquidGlassButton>
                          </div>
                          {looksTruncated && (
                            <span className="text-xs text-yellow-300/90">
                              Este segmento parece truncado en origen.
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-white/70 text-sm font-semibold mb-2">Métricas paralingüísticas</p>
                        {Object.keys(speakerMetrics).length === 0 ? (
                          <p className="text-white/60 text-sm">No hay métricas disponibles.</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(speakerMetrics).map(([speaker, metrics]) => (
                              <div key={`${segment.segment_id}-${speaker}`} className="rounded-xl bg-black/25 border border-white/10 p-3">
                                <p className="text-white text-sm font-semibold mb-2">{speaker}</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {metricOrder.map((metricKey) => {
                                    const meta = METRIC_META[metricKey];
                                    const rawValue = (metrics as Record<string, unknown>)[metricKey];
                                    const value = formatMetricValue(rawValue);
                                    const status =
                                      typeof rawValue === 'number'
                                        ? meta.evaluate(rawValue)
                                        : 'neutral';
                                    const statusText =
                                      status === 'good'
                                        ? 'Bueno'
                                        : status === 'bad'
                                          ? 'Mejorable'
                                          : 'Intermedio';
                                    const statusClass =
                                      status === 'good'
                                        ? 'text-green-300'
                                        : status === 'bad'
                                          ? 'text-red-300'
                                          : 'text-yellow-300';
                                    return (
                                      <div key={`${speaker}-${metricKey}`} className="rounded-lg border border-white/10 bg-white/5 p-2">
                                        <p className="text-white text-xs font-semibold">{meta.label}: <span className="text-[#00E5FF]">{value}</span></p>
                                        <p className="text-white/55 text-[11px] leading-relaxed">{meta.description}</p>
                                        <p className="text-white/55 text-[11px] leading-relaxed">Rango típico: {meta.typicalRange}</p>
                                        <p className={`text-[11px] font-semibold ${statusClass}`}>Estado: {statusText}</p>
                                        <p className="text-white/50 text-[11px] leading-relaxed">
                                          {status === 'good' ? meta.goodHint : status === 'bad' ? meta.badHint : 'Valor en zona intermedia.'}
                                        </p>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <LiquidGlassButton
                  variant="secondary"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={!canGoPrev}
                >
                  Anterior
                </LiquidGlassButton>
                <p className="text-white/60 text-sm">
                  Mostrando {Math.min(offset + 1, data.segments.total)}-{Math.min(offset + limit, data.segments.total)} de {data.segments.total}
                </p>
                <LiquidGlassButton
                  variant="secondary"
                  onClick={() => setOffset(offset + limit)}
                  disabled={!canGoNext}
                  className="flex items-center gap-2"
                >
                  Siguiente
                  <ExternalLink className="w-4 h-4" />
                </LiquidGlassButton>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicDashboardScreen;
