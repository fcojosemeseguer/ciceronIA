/**
 * DebateDetailsScreen (Nuevo) - Pantalla de detalles de un debate
 * Muestra información completa del debate unificado (live o analysis)
 * 
 * Props:
 * - debate: Debate - El debate a mostrar
 * - onBack: () => void - Volver atrás
 */

import React, { useEffect, useMemo, useState } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Trophy, 
  Users, 
  MessageSquare,
  Target,
  Mic,
  Award,
  BarChart3,
  Download,
  Share2,
  FileAudio,
  Loader2,
  Play,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Debate, AnalysisResult, ProjectDashboardResponse } from '../../types';
import { useUnifiedDebateStore } from '../../store';
import { LiquidGlassButton } from '../common';
import { debatesService } from '../../api/debates';

interface DebateDetailsScreenProps {
  debate: Debate;
  onBack: () => void;
  onContinue?: () => void;
}

export const DebateDetailsScreen: React.FC<DebateDetailsScreenProps> = ({ debate, onBack, onContinue }) => {
  const { deleteDebate } = useUnifiedDebateStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [dashboard, setDashboard] = useState<ProjectDashboardResponse | undefined>(undefined);
  const [expandedAnalysisKeys, setExpandedAnalysisKeys] = useState<string[]>([]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'No disponible';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} minutos`;
  };

  const getModeIcon = () => {
    return debate.mode === 'live' ? (
      <Mic className="w-5 h-5" />
    ) : (
      <FileAudio className="w-5 h-5" />
    );
  };

  const getModeLabel = () => {
    return debate.mode === 'live' ? 'Debate en Vivo' : 'Análisis de Grabación';
  };

  const getStatusColor = () => {
    switch (debate.status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'draft':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getStatusLabel = () => {
    switch (debate.status) {
      case 'completed':
        return 'Completado';
      case 'in_progress':
        return 'En progreso';
      case 'draft':
        return 'Borrador';
      case 'cancelled':
        return 'Cancelado';
      default:
        return debate.status;
    }
  };

  const getWinnerInfo = () => {
    if (!debate.winner || debate.winner === 'draw') {
      return { name: 'Empate', color: 'text-white/60', bgColor: 'bg-white/10' };
    }
    const isTeamA = debate.winner === 'A';
    return {
      name: isTeamA ? debate.team_a_name : debate.team_b_name,
      color: isTeamA ? 'text-[#FF6B00]' : 'text-[#00E5FF]',
      bgColor: isTeamA ? 'bg-[#FF6B00]/20' : 'bg-[#00E5FF]/20',
    };
  };

  const teamALabel = 'A favor';
  const teamBLabel = 'En contra';

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteDebate(debate.code);
      onBack();
    } catch (err) {
      console.error('Error deleting debate:', err);
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadDebateDetails = async () => {
      if (debate.mode !== 'analysis') {
        return;
      }

      setIsLoadingAnalysis(true);
      setAnalysisError(null);

      try {
        const result = await debatesService.getDebate(debate.code, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 50,
          offset: 0,
        });

        if (!isMounted) {
          return;
        }

        setAnalyses(result.analyses || []);
        setDashboard(result.dashboard);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setAnalysisError('No se pudieron cargar las calificaciones de este debate.');
      } finally {
        if (isMounted) {
          setIsLoadingAnalysis(false);
        }
      }
    };

    loadDebateDetails();

    return () => {
      isMounted = false;
    };
  }, [debate.code, debate.mode]);

  const winner = getWinnerInfo();
  const isContinuable = debate.status === 'draft' || debate.status === 'in_progress';
  const scoreByPostura = useMemo(() => {
    if (!dashboard?.summary?.score_by_postura) {
      return [];
    }

    return Object.entries(dashboard.summary.score_by_postura).map(([postura, score]) => ({
      postura,
      average: score.avg_score_percent,
      count: score.count,
    }));
  }, [dashboard]);

  const topSpeaker = useMemo(() => {
    if (!dashboard?.summary?.score_by_orador) {
      return null;
    }

    return Object.entries(dashboard.summary.score_by_orador)
      .map(([speaker, score]) => ({
        speaker,
        average: score.avg_score_percent,
        count: score.count,
      }))
      .sort((a, b) => b.average - a.average)[0] || null;
  }, [dashboard]);

  const scoreByFase = useMemo(() => {
    if (!dashboard?.summary?.score_by_fase) {
      return [];
    }

    return Object.entries(dashboard.summary.score_by_fase).map(([fase, score]) => ({
      fase,
      average: score.avg_score_percent,
      count: score.count,
    }));
  }, [dashboard]);

  const teamSummaries = useMemo(() => {
    const buildSummary = (label: string, name: string, accent: 'orange' | 'cyan') => {
      const normalizedLabel = label.trim().toLowerCase();
      const relatedAnalyses = analyses.filter((analysis) => analysis.postura.trim().toLowerCase() === normalizedLabel);
      const summaryItem = scoreByPostura.find((item) => item.postura.trim().toLowerCase() === normalizedLabel);
      const average = summaryItem?.average ?? (
        relatedAnalyses.length > 0
          ? relatedAnalyses.reduce((acc, analysis) => acc + (analysis.score_percent ?? (analysis.total / analysis.max_total) * 100), 0) / relatedAnalyses.length
          : 0
      );

      return {
        label,
        name,
        average,
        count: summaryItem?.count ?? relatedAnalyses.length,
        analyses: relatedAnalyses,
        accentText: accent === 'orange' ? 'text-[#FF6B00]' : 'text-[#00E5FF]',
        accentSurface: accent === 'orange' ? 'bg-[#FF6B00]/10 border-[#FF6B00]/20' : 'bg-[#00E5FF]/10 border-[#00E5FF]/20',
        accentBar: accent === 'orange' ? 'bg-[#FF6B00]' : 'bg-[#00E5FF]',
      };
    };

    return [
      buildSummary(teamALabel, debate.team_a_name, 'orange'),
      buildSummary(teamBLabel, debate.team_b_name, 'cyan'),
    ];
  }, [analyses, debate.team_a_name, debate.team_b_name, scoreByPostura]);

  const toggleExpandedAnalysis = (key: string) => {
    setExpandedAnalysisKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  return (
    <div className="app-shell overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/20 hover:border-red-500/30 text-white/60 hover:text-red-400 transition-colors"
                title="Eliminar debate"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border ${getStatusColor()}`}>
              {getModeIcon()}
              {getModeLabel()}
            </span>
            <span className="text-white/40">•</span>
            <span className="text-white/60 text-sm">
              {debate.debate_type_name || debate.debate_type}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            {debate.name}
          </h1>
          <p className="text-xl text-white/60">
            {debate.debate_topic}
          </p>

          {isContinuable && onContinue && (
            <div className="mt-5">
              <LiquidGlassButton
                onClick={onContinue}
                variant="primary"
                className="inline-flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {debate.mode === 'live' ? 'Continuar debate' : 'Continuar análisis'}
              </LiquidGlassButton>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3 text-white/60 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="text-sm">Fecha</span>
            </div>
            <p className="text-white font-medium">
              {formatDate(debate.created_at)}
            </p>
          </div>

          {debate.duration && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 text-white/60 mb-2">
                <Clock className="w-5 h-5" />
                <span className="text-sm">Duración</span>
              </div>
              <p className="text-white font-medium">
                {formatDuration(debate.duration)}
              </p>
            </div>
          )}

          {debate.segments_count !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 text-white/60 mb-2">
                <FileAudio className="w-5 h-5" />
                <span className="text-sm">Análisis</span>
              </div>
              <p className="text-white font-medium">
                {debate.segments_count} segmentos
              </p>
            </div>
          )}

          {debate.average_score !== undefined && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 text-white/60 mb-2">
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm">Puntuación Media</span>
              </div>
              <p className="text-white font-medium">
                {debate.average_score.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Teams Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Team A */}
          <div className={`rounded-2xl p-6 border-2 ${
            debate.winner === 'A' 
              ? 'border-[#FF6B00]/50 bg-[#FF6B00]/5' 
              : 'border-white/10 bg-white/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-sm text-[#FF6B00] font-medium">{teamALabel}</p>
                  <h3 className="text-xl font-bold text-white">{debate.team_a_name}</h3>
                </div>
              </div>
              
              {debate.winner === 'A' && (
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Ganador</span>
                </div>
              )}
            </div>

            {debate.scores && debate.scores.length > 0 && (
              <div className="space-y-2">
                {debate.scores
                  .filter(s => s.teamId === 'A')
                  .map((score, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/60">Puntuación</span>
                      <span className="text-white font-semibold">{score.total}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Team B */}
          <div className={`rounded-2xl p-6 border-2 ${
            debate.winner === 'B' 
              ? 'border-[#00E5FF]/50 bg-[#00E5FF]/5' 
              : 'border-white/10 bg-white/5'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00E5FF]/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <div>
                  <p className="text-sm text-[#00E5FF] font-medium">{teamBLabel}</p>
                  <h3 className="text-xl font-bold text-white">{debate.team_b_name}</h3>
                </div>
              </div>
              
              {debate.winner === 'B' && (
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Ganador</span>
                </div>
              )}
            </div>

            {debate.scores && debate.scores.length > 0 && (
              <div className="space-y-2">
                {debate.scores
                  .filter(s => s.teamId === 'B')
                  .map((score, idx) => (
                    <div key={idx} className="flex justify-between items-center py-2 border-b border-white/10">
                      <span className="text-white/60">Puntuación</span>
                      <span className="text-white font-semibold">{score.total}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        {debate.summary && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-white/60" />
              <h2 className="text-xl font-bold text-white">Resumen</h2>
            </div>
            <p className="text-white/70 leading-relaxed">{debate.summary}</p>
          </div>
        )}

        {debate.mode === 'analysis' && (
          <>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-5">
                <BarChart3 className="w-6 h-6 text-white/60" />
                <h2 className="text-xl font-bold text-white">Calificaciones de momento</h2>
              </div>

              {isLoadingAnalysis ? (
                <div className="flex items-center gap-3 text-white/60">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Cargando analisis...</span>
                </div>
              ) : analysisError ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
                  {analysisError}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-white/50 text-sm mb-1">Segmentos analizados</p>
                    <p className="text-2xl font-bold text-white">
                      {dashboard?.summary?.total_segments ?? analyses.length}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-white/50 text-sm mb-1">Puntuacion media</p>
                    <p className="text-2xl font-bold text-white">
                      {dashboard?.summary?.average_score_percent !== undefined
                        ? `${dashboard.summary.average_score_percent.toFixed(1)}%`
                        : debate.average_score !== undefined
                          ? `${debate.average_score.toFixed(1)}%`
                          : 'Sin datos'}
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <p className="text-white/50 text-sm mb-1">Orador destacado</p>
                    <p className="text-lg font-bold text-white truncate">
                      {topSpeaker?.speaker || 'Pendiente'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {!isLoadingAnalysis && !analysisError && scoreByPostura.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-bold text-white">Resumen de puntuaciones</h2>
                  {topSpeaker && (
                    <p className="text-sm text-white/45">
                      Orador destacado: <span className="text-white font-medium">{topSpeaker.speaker}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                  {teamSummaries.map((team) => (
                    <div key={team.label} className={`rounded-2xl border p-5 ${team.accentSurface}`}>
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${team.accentText}`}>
                            {team.label}
                          </p>
                          <h3 className="text-2xl font-bold text-white mt-1">{team.name}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-white">{team.average.toFixed(1)}%</p>
                          <p className="text-xs text-white/45">{team.count} analisis</p>
                        </div>
                      </div>

                      <div className="h-3 rounded-full bg-white/10 overflow-hidden mb-4">
                        <div
                          className={`h-full rounded-full ${team.accentBar}`}
                          style={{ width: `${Math.max(0, Math.min(team.average, 100))}%` }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-black/10 border border-white/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-1">Segmentos</p>
                          <p className="text-lg font-semibold text-white">{team.analyses.length}</p>
                        </div>
                        <div className="rounded-xl bg-black/10 border border-white/10 p-3">
                          <p className="text-[11px] uppercase tracking-[0.14em] text-white/40 mb-1">Mejor nota</p>
                          <p className="text-lg font-semibold text-white">
                            {team.analyses.length > 0
                              ? `${Math.max(...team.analyses.map((analysis) => analysis.score_percent ?? (analysis.total / analysis.max_total) * 100)).toFixed(1)}%`
                              : '0.0%'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {scoreByFase.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                    <h3 className="text-sm font-semibold text-white/75 uppercase tracking-[0.16em] mb-4">Por fase</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {scoreByFase.map((item) => (
                        <div key={item.fase} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-white font-medium">{item.fase}</span>
                            <span className="text-sm text-white/65">{item.average.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-white/70"
                              style={{ width: `${Math.max(0, Math.min(item.average, 100))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!isLoadingAnalysis && !analysisError && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between gap-4 mb-5">
                  <h2 className="text-xl font-bold text-white">Analisis detallados</h2>
                  <p className="text-sm text-white/45">Abre solo lo que quieras revisar</p>
                </div>
                {analyses.length === 0 ? (
                  <p className="text-white/50">Todavia no hay analisis para este debate.</p>
                ) : (
                  <div className="space-y-3">
                    {analyses.map((analysis, index) => (
                      (() => {
                        const key = `${analysis.fase}-${analysis.postura}-${analysis.orador}-${index}`;
                        const isExpanded = expandedAnalysisKeys.includes(key);
                        const scorePercent = analysis.score_percent !== undefined
                          ? analysis.score_percent
                          : (analysis.total / analysis.max_total) * 100;
                        const accentClass = analysis.postura.trim().toLowerCase().includes('favor')
                          ? 'text-[#FF6B00] border-[#FF6B00]/20 bg-[#FF6B00]/10'
                          : 'text-[#00E5FF] border-[#00E5FF]/20 bg-[#00E5FF]/10';

                        return (
                          <div key={key} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                            <button
                              onClick={() => toggleExpandedAnalysis(key)}
                              className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className={`px-2.5 py-1 rounded-full text-xs border ${accentClass}`}>
                                    {analysis.postura}
                                  </span>
                                  <span className="text-white font-semibold">{analysis.fase}</span>
                                </div>
                                <p className="text-sm text-white/50 truncate">{analysis.orador}</p>
                              </div>
                              <div className="flex items-center gap-4 shrink-0">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-white">{scorePercent.toFixed(1)}%</p>
                                  <p className="text-xs text-white/40">{analysis.total}/{analysis.max_total}</p>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-white/50" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-white/50" />
                                )}
                              </div>
                            </button>

                            {isExpanded && (
                              <div className="px-5 pb-5">
                                <div className="space-y-2 pt-2 border-t border-white/10">
                                  {analysis.criterios.map((criterio, criterioIndex) => (
                                    <div key={`${criterio.criterio}-${criterioIndex}`} className="flex items-start gap-4 rounded-xl bg-white/5 p-3">
                                      <div className="w-14 text-center shrink-0">
                                        <span className="text-lg font-bold text-white">{criterio.nota}</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium mb-1">{criterio.criterio}</p>
                                        <p className="text-white/60 text-sm">{criterio.anotacion}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Description */}
        {debate.description && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageSquare className="w-6 h-6 text-white/60" />
              <h2 className="text-xl font-bold text-white">Descripción</h2>
            </div>
            <p className="text-white/70 leading-relaxed">{debate.description}</p>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative w-full max-w-md p-6 rounded-2xl backdrop-blur-2xl bg-slate-900/90 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">
              ¿Eliminar debate?
            </h3>
            <p className="text-white/60 mb-6">
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados a este debate.
            </p>
            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => setShowDeleteConfirm(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={handleDelete}
                variant="primary"
                className="flex-1 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Eliminar'
                )}
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebateDetailsScreen;
