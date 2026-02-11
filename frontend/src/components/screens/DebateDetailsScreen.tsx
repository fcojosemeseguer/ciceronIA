/**
 * DebateDetailsScreen - Pantalla de detalles de un debate
 * Muestra puntuaciones, resumen, tema y equipos
 */

import React from 'react';
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
  Share2
} from 'lucide-react';
import { DebateHistory } from '../../types';

interface DebateDetailsScreenProps {
  debate: DebateHistory;
  onBack: () => void;
}

export const DebateDetailsScreen: React.FC<DebateDetailsScreenProps> = ({ debate, onBack }) => {
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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} minutos`;
  };

  const getWinnerTeam = () => {
    if (debate.winner === 'draw') return null;
    return debate.scores.find(s => s.teamId === debate.winner);
  };

  const winnerTeam = getWinnerTeam();
  const teamA = debate.scores.find(s => s.teamId === 'A');
  const teamB = debate.scores.find(s => s.teamId === 'B');

  const ScoreBar = ({ label, teamAValue, teamBValue, max = 100 }: { 
    label: string; 
    teamAValue: number; 
    teamBValue: number;
    max?: number;
  }) => (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-[#FF6B00] font-medium">{teamAValue}</span>
        <span className="text-slate-400">{label}</span>
        <span className="text-[#00E5FF] font-medium">{teamBValue}</span>
      </div>
      <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#FF6B00] to-[#CC5500] rounded-full transition-all duration-500"
          style={{ width: `${(teamAValue / max) * 50}%` }}
        />
        <div 
          className="absolute right-0 top-0 h-full bg-gradient-to-l from-[#00E5FF] to-[#00B8CC] rounded-full transition-all duration-500"
          style={{ width: `${(teamBValue / max) * 50}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 flex-shrink-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back button */}
            <div className="w-32">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white/90 rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Center: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <img src="/logo.svg" alt="CiceronAI" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-white">CiceronAI</span>
            </div>

            {/* Right: Action buttons */}
            <div className="w-32 flex justify-end items-center gap-2">
              <button className="p-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white/90 rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]">
                <Share2 className="w-5 h-5" />
              </button>
              <button className="p-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white/90 rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]">
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {/* Topic Section */}
        <div className="bg-gradient-to-br from-[#00E5FF]/20 to-[#FF6B00]/20 border border-[#00E5FF]/30 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#00E5FF]/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-6 h-6 text-[#00E5FF]" />
            </div>
            <div>
              <p className="text-sm text-[#00E5FF] font-medium mb-1">TEMA DEL DEBATE</p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{debate.topic}</h1>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Calendar className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 mb-1">Fecha</p>
            <p className="text-sm text-white font-medium">{formatDate(debate.date)}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Clock className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 mb-1">Duración</p>
            <p className="text-sm text-white font-medium">{formatDuration(debate.duration)}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Mic className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 mb-1">Grabaciones</p>
            <p className="text-sm text-white font-medium">{debate.recordingsCount} intervenciones</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <Trophy className="w-5 h-5 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 mb-1">Resultado</p>
            <p className={`text-sm font-medium ${
              debate.winner === 'draw' ? 'text-yellow-400' : 
              debate.winner === 'A' ? 'text-[#FF6B00]' : 'text-[#00E5FF]'
            }`}>
              {debate.winner === 'draw' ? 'Empate' : `Ganó ${winnerTeam?.teamName}`}
            </p>
          </div>
        </div>

        {/* Teams & Scores */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Team A Card */}
          <div className={`bg-slate-800/50 border-2 rounded-2xl p-6 ${
            debate.winner === 'A' ? 'border-[#FF6B00]/50 bg-[#FF6B00]/5' : 'border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-sm text-[#FF6B00] font-medium">EQUIPO A</p>
                  <h3 className="text-xl font-bold text-white">{debate.teamAName}</h3>
                </div>
              </div>
              
              {debate.winner === 'A' && (
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Ganador</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Argumentación</span>
                <span className="text-white font-semibold">{teamA?.argumentation}/100</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Refutación</span>
                <span className="text-white font-semibold">{teamA?.refutation}/100</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Presentación</span>
                <span className="text-white font-semibold">{teamA?.presentation}/100</span>
              </div>
              <div className="flex justify-between items-center py-3 mt-2">
                <span className="text-lg text-white font-bold">TOTAL</span>
                <span className="text-2xl text-[#FF6B00] font-bold">{teamA?.total}</span>
              </div>
            </div>
          </div>

          {/* Team B Card */}
          <div className={`bg-slate-800/50 border-2 rounded-2xl p-6 ${
            debate.winner === 'B' ? 'border-[#00E5FF]/50 bg-[#00E5FF]/5' : 'border-slate-700'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#00E5FF]/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#00E5FF]" />
                </div>
                <div>
                  <p className="text-sm text-[#00E5FF] font-medium">EQUIPO B</p>
                  <h3 className="text-xl font-bold text-white">{debate.teamBName}</h3>
                </div>
              </div>
              
              {debate.winner === 'B' && (
                <div className="flex items-center gap-1 px-3 py-1 bg-yellow-500/20 rounded-full">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm text-yellow-400 font-medium">Ganador</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Argumentación</span>
                <span className="text-white font-semibold">{teamB?.argumentation}/100</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Refutación</span>
                <span className="text-white font-semibold">{teamB?.refutation}/100</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Presentación</span>
                <span className="text-white font-semibold">{teamB?.presentation}/100</span>
              </div>
              <div className="flex justify-between items-center py-3 mt-2">
                <span className="text-lg text-white font-bold">TOTAL</span>
                <span className="text-2xl text-[#00E5FF] font-bold">{teamB?.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Score Comparison */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-slate-400" />
            <h2 className="text-xl font-bold text-white">Comparativa de Puntuaciones</h2>
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="text-center">
              <p className="text-[#FF6B00] font-bold text-lg">{debate.teamAName}</p>
              <p className="text-3xl font-bold text-white">{teamA?.total}</p>
            </div>
            <div className="flex-1 mx-8">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF6B00] to-[#00E5FF] rounded-full"
                  style={{ 
                    background: `linear-gradient(to right, #ef4444 ${(teamA!.total / (teamA!.total + teamB!.total)) * 100}%, #3b82f6 ${(teamA!.total / (teamA!.total + teamB!.total)) * 100}%)`
                  }}
                />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[#00E5FF] font-bold text-lg">{debate.teamBName}</p>
              <p className="text-3xl font-bold text-white">{teamB?.total}</p>
            </div>
          </div>

          <ScoreBar 
            label="Argumentación" 
            teamAValue={teamA!.argumentation} 
            teamBValue={teamB!.argumentation} 
          />
          <ScoreBar 
            label="Refutación" 
            teamAValue={teamA!.refutation} 
            teamBValue={teamB!.refutation} 
          />
          <ScoreBar 
            label="Presentación" 
            teamAValue={teamA!.presentation} 
            teamBValue={teamB!.presentation} 
          />
        </div>

        {/* Summary */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-6 h-6 text-slate-400" />
            <h2 className="text-xl font-bold text-white">Resumen del Debate</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">{debate.summary}</p>
        </div>
        </div>
      </main>
    </div>
  );
};
