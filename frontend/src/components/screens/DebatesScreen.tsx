/**
 * DebatesScreen - Pantalla de debates anteriores
 */

import React, { useEffect, useState } from 'react';
import {
  Loader2,
  Calendar,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { useUnifiedDebateStore } from '../../store';
import { Debate } from '../../types';
import { BackLink, BrandHeader, Breadcrumbs, LiquidGlassButton } from '../common';
import liveIcon from '../../assets/icons/icon-envivo.svg';
import analysisIcon from '../../assets/icons/icon-audioanalisis.svg';

interface DebatesScreenProps {
  onSelectDebate: (debate: Debate) => void;
  onViewDebateDetails?: (debate: Debate) => void;
  onBack: () => void;
  onNewLiveDebate: () => void;
  onNewAnalysis: () => void;
}

export const DebatesScreen: React.FC<DebatesScreenProps> = ({
  onSelectDebate,
  onViewDebateDetails,
  onBack,
}) => {
  const {
    debates,
    isLoading,
    error,
    fetchDebates,
    deleteDebate,
    clearError,
  } = useUnifiedDebateStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'live' | 'analysis'>('all');

  useEffect(() => {
    fetchDebates();
  }, [fetchDebates]);

  const filteredDebates = debates.filter((debate) => {
    if (modeFilter === 'all') return true;
    return debate.mode === modeFilter;
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

  const isContinuable = (debate: Debate) => debate.status === 'draft' || debate.status === 'in_progress';

  const handleViewRatings = (debate: Debate) => {
    (onViewDebateDetails || onSelectDebate)(debate);
  };

  return (
    <div className="app-shell overflow-y-auto pb-32">
      <div className="px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[1040px]">
          <BrandHeader className="mb-8" />
          <Breadcrumbs className="mb-3" items={[{ label: 'Panel de Control', onClick: onBack }, { label: 'Debates Anteriores' }]} />
          <div className="mb-8 flex items-center justify-between gap-3">
            <h1 className="text-[46px] sm:text-[74px] leading-none text-[#2C2C2C]">Debates Anteriores</h1>
            <BackLink onClick={onBack} label="Volver" />
          </div>

          <div className="mb-6">
            <div className="inline-flex rounded-[14px] border border-[#2C2C2C]/18 bg-[#ECECE9] p-1">
              <button
                type="button"
                onClick={() => setModeFilter('all')}
                className="rounded-[10px] px-4 py-2 text-[18px] sm:text-[22px]"
                style={{
                  background: modeFilter === 'all' ? '#1C1D1F' : 'transparent',
                  color: modeFilter === 'all' ? '#F5F5F3' : '#2C2C2C',
                }}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('live')}
                className="rounded-[10px] px-4 py-2 text-[18px] sm:text-[22px]"
                style={{
                  background: modeFilter === 'live' ? '#1C1D1F' : 'transparent',
                  color: modeFilter === 'live' ? '#F5F5F3' : '#2C2C2C',
                }}
              >
                En vivo
              </button>
              <button
                type="button"
                onClick={() => setModeFilter('analysis')}
                className="rounded-[10px] px-4 py-2 text-[18px] sm:text-[22px]"
                style={{
                  background: modeFilter === 'analysis' ? '#1C1D1F' : 'transparent',
                  color: modeFilter === 'analysis' ? '#F5F5F3' : '#2C2C2C',
                }}
              >
                Analizados
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700">
              {error}
              <button onClick={clearError} className="ml-4 text-sm underline">
                Cerrar
              </button>
            </div>
          )}

          {isLoading && debates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[#2C2C2C]/60" />
              <p className="text-[#2C2C2C]/70">Cargando debates...</p>
            </div>
          ) : sortedDebates.length === 0 ? (
            <div className="rounded-[20px] border border-[#2C2C2C]/15 bg-[#ECECE9] px-6 py-14 text-center">
              <p className="text-[34px] text-[#2C2C2C]">No hay debates para mostrar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {sortedDebates.map((debate) => {
                const status = debate.status === 'completed' ? 'completed' : 'in_progress';
                const statusDot = status === 'completed' ? '#3A7D44' : '#E6C068';

                return (
                  <div
                    key={debate.code}
                    className="relative rounded-[16px] border border-[#2C2C2C]/14 bg-[#ECECE9] px-4 py-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[24px] sm:text-[36px] leading-none text-[#2C2C2C]">{debate.name}</p>
                        <p className="mt-1 truncate text-[18px] text-[#2C2C2C]/75">
                          {debate.team_a_name} vs {debate.team_b_name}
                        </p>
                        <p className="truncate text-[16px] text-[#2C2C2C]/55">{debate.debate_topic}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border"
                          style={{ background: `${statusDot}20`, borderColor: `${statusDot}55`, color: statusDot }}
                        >
                          <img src={debate.mode === 'live' ? liveIcon : analysisIcon} alt="" className="h-4 w-4" aria-hidden />
                        </span>
                        <button
                          onClick={() => setShowDeleteConfirm(debate.code)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#2C2C2C]/15 text-[#2C2C2C]/70 hover:opacity-90"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[15px] text-[#2C2C2C]/55">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(debate.created_at)}
                      </span>
                      <button
                        onClick={() => (isContinuable(debate) ? onSelectDebate(debate) : handleViewRatings(debate))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[#2C2C2C] hover:bg-[#2C2C2C]/8"
                        aria-label="Abrir debate"
                      >
                        <ArrowRight className="h-7 w-7" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#2C2C2C]/18 bg-[#F5F5F3] p-6">
            <h3 className="mb-2 text-[32px] leading-none text-[#2C2C2C]">
              Eliminar debate
            </h3>
            <p className="mb-6 text-[24px] leading-tight text-[#2C2C2C]/75">
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => setShowDeleteConfirm(null)}
                variant="secondary"
                className="flex-1 rounded-xl border border-[#2C2C2C]/15 bg-[#ECECE9] text-[#2C2C2C]"
              >
                Cancelar
              </LiquidGlassButton>
              <LiquidGlassButton
                onClick={() => handleDelete(showDeleteConfirm)}
                variant="danger"
                className="flex-1 rounded-xl border-0 bg-[#C44536] text-white"
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
