/**
 * DebateDetailsScreen (Nuevo) - Pantalla de detalles de un debate
 * Muestra información completa del debate unificado (live o analysis)
 * 
 * Props:
 * - debate: Debate - El debate a mostrar
 * - onBack: () => void - Volver atrás
 */

import React, { useEffect, useState } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { Debate, DebateMode, DebateStatus, TeamPosition } from '../../types';
import { useUnifiedDebateStore } from '../../store';
import { LiquidGlassButton } from '../common';

interface DebateDetailsScreenProps {
  debate: Debate;
  onBack: () => void;
}

export const DebateDetailsScreen: React.FC<DebateDetailsScreenProps> = ({ debate, onBack }) => {
  const { deleteDebate } = useUnifiedDebateStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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

  const winner = getWinnerInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
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
                  <p className="text-sm text-[#FF6B00] font-medium">EQUIPO A</p>
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
                  <p className="text-sm text-[#00E5FF] font-medium">EQUIPO B</p>
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
