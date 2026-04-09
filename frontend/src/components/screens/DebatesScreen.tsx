/**
 * DebatesScreen - Pantalla de debates anteriores
 */

import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Loader2,
  Mic,
  FileAudio,
  Calendar,
  Trophy,
  Trash2,
  Play,
  BarChart3,
} from 'lucide-react';
import { useUnifiedDebateStore } from '../../store';
import { Debate, DebateMode, DebateStatus } from '../../types';
import { LiquidGlassButton } from '../common';

interface DebatesScreenProps {
  onSelectDebate: (debate: Debate) => void;
  onViewDebateDetails?: (debate: Debate) => void;
  onBack: () => void;
  onNewLiveDebate: () => void;
  onNewAnalysis: () => void;
}

type FilterMode = 'all' | DebateMode;
type FilterStatus = 'all' | 'in_progress' | 'completed';

export const DebatesScreen: React.FC<DebatesScreenProps> = ({
  onSelectDebate,
  onViewDebateDetails,
  onBack,
  onNewLiveDebate,
  onNewAnalysis,
}) => {
  const {
    debates,
    isLoading,
    error,
    fetchDebates,
    deleteDebate,
    clearError,
  } = useUnifiedDebateStore();

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchDebates();
  }, [fetchDebates]);

  const filteredDebates = debates.filter((debate) => {
    if (filterMode !== 'all' && debate.mode !== filterMode) return false;
    const normalizedStatus = debate.status === 'completed' ? 'completed' : 'in_progress';
    if (filterStatus !== 'all' && normalizedStatus !== filterStatus) return false;
    return true;
  });

  const getSortTimestamp = (debate: Debate) => {
    const safeDate = (value?: string) => {
      if (!value) return 0;
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) ? timestamp : 0;
    };
    const fallback = safeDate(debate.created_at);
    const startedAt = safeDate(debate.started_at);
    const completedAt = safeDate(debate.completed_at);
    return Math.max(fallback, startedAt, completedAt);
  };

  const sortedDebates = [...filteredDebates].sort(
    (a, b) => getSortTimestamp(b) - getSortTimestamp(a)
  );

  const handleDelete = async (code: string) => {
    try {
      await deleteDebate(code);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting debate:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const timestamp = new Date(dateString).getTime();
    const date = Number.isFinite(timestamp) ? new Date(timestamp) : new Date();
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: DebateStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'draft':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-white/10 text-white/60 border-white/20';
    }
  };

  const getModeIcon = (mode: DebateMode) => {
    return mode === 'live' ? <Mic className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />;
  };

  const getModeLabel = (mode: DebateMode) => {
    return mode === 'live' ? 'En vivo' : 'Analisis';
  };

  const isContinuable = (debate: Debate) => debate.status === 'draft' || debate.status === 'in_progress';

  const handleViewRatings = (debate: Debate) => {
    (onViewDebateDetails || onSelectDebate)(debate);
  };

  return (
    <div className="app-shell overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Debates Anteriores</h1>
                <p className="text-white/50">Historial de debates y analisis</p>
              </div>
            </div>

            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={onNewAnalysis}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <FileAudio className="w-4 h-4" />
                <span className="hidden sm:inline">Analizar</span>
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={onNewLiveDebate}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Debate</span>
              </LiquidGlassButton>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
              <button onClick={clearError} className="ml-4 text-sm underline">
                Cerrar
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">Modo:</span>
              <div className="flex rounded-lg bg-white/5 border border-white/10 overflow-hidden">
                {(['all', 'live', 'analysis'] as FilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      filterMode === mode
                        ? 'bg-white/10 text-white'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {mode === 'all' ? 'Todos' : mode === 'live' ? 'En vivo' : 'Analisis'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-white/50">Estado:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-white/30"
              >
                <option value="all" className="bg-slate-900">Todos</option>
                <option value="completed" className="bg-slate-900">Completados</option>
                <option value="in_progress" className="bg-slate-900">En progreso</option>
              </select>
            </div>
          </div>

          {isLoading && debates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-white/70 animate-spin mb-4" />
              <p className="text-white/50">Cargando debates...</p>
            </div>
          ) : sortedDebates.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                <Plus className="w-10 h-10 text-white/30" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                {filterMode === 'all' && filterStatus === 'all'
                  ? 'No tienes debates aun'
                  : 'No hay debates con estos filtros'}
              </h3>
              <p className="text-white/50 mb-6">
                {filterMode === 'all' && filterStatus === 'all'
                  ? 'Crea tu primer debate para comenzar'
                  : 'Prueba con otros filtros o crea un nuevo debate'}
              </p>
              <div className="flex gap-3 justify-center">
                <LiquidGlassButton onClick={onNewAnalysis} variant="secondary">
                  <FileAudio className="w-4 h-4 mr-2 inline" />
                  Analizar Audio
                </LiquidGlassButton>
                <LiquidGlassButton onClick={onNewLiveDebate} variant="primary">
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Nuevo Debate
                </LiquidGlassButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedDebates.map((debate) => (
                <div
                  key={debate.code}
                  className="group relative p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(debate.status)}`}>
                        {getModeIcon(debate.mode)}
                        {getModeLabel(debate.mode)}
                      </span>
                      <span className="text-xs text-white/40">
                        {debate.debate_type_name || debate.debate_type}
                      </span>
                    </div>
                    <div className="relative z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowDeleteConfirm(debate.code)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-1">
                      {debate.name}
                    </h3>
                    <p className="text-sm text-white/50 line-clamp-1">
                      {debate.debate_topic}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#FF6B00]">{debate.team_a_name}</span>
                      <span>vs</span>
                      <span className="text-[#00E5FF]">{debate.team_b_name}</span>
                    </div>
                    <div className="flex items-center gap-4 ml-auto">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(debate.created_at)}
                      </span>
                      {debate.segments_count !== undefined && debate.segments_count > 0 && (
                        <span className="flex items-center gap-1">
                          <FileAudio className="w-3.5 h-3.5" />
                          {debate.segments_count} analisis
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 mt-5 flex flex-wrap gap-3">
                    {isContinuable(debate) && (
                      <LiquidGlassButton
                        onClick={() => onSelectDebate(debate)}
                        variant="primary"
                        className="flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Continuar
                      </LiquidGlassButton>
                    )}

                    <LiquidGlassButton
                      onClick={() => handleViewRatings(debate)}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      {'Ver calificaciones'}
                    </LiquidGlassButton>
                  </div>

                  {debate.status === 'completed' && debate.winner && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <Trophy
                          className={`w-4 h-4 ${
                            debate.winner === 'A'
                              ? 'text-[#FF6B00]'
                              : debate.winner === 'B'
                                ? 'text-[#00E5FF]'
                                : 'text-white/40'
                          }`}
                        />
                        <span className="text-sm text-white/70">
                          {debate.winner === 'draw'
                            ? 'Empate'
                            : `Ganador: ${debate.winner === 'A' ? debate.team_a_name : debate.team_b_name}`}
                        </span>
                        {debate.average_score !== undefined && (
                          <span className="ml-auto text-sm text-white/50">
                            Puntuacion media: {debate.average_score.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => onSelectDebate(debate)}
                    className="absolute inset-0 w-full h-full rounded-2xl opacity-0"
                    aria-label={`Ver debate ${debate.name}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md p-6 rounded-2xl backdrop-blur-2xl bg-slate-900/90 border border-white/10">
            <h3 className="text-lg font-semibold text-white mb-2">
              Eliminar debate
            </h3>
            <p className="text-white/60 mb-6">
              Esta accion no se puede deshacer. Se eliminaran todos los datos asociados a este debate.
            </p>
            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => setShowDeleteConfirm(null)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={() => handleDelete(showDeleteConfirm)}
                variant="primary"
                className="flex-1 bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-400"
              >
                Eliminar
              </LiquidGlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebatesScreen;
