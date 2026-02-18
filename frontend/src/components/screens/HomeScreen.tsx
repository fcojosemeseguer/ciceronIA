/**
 * HomeScreen - Historial de Debates
 * Página dedicada exclusivamente al historial de debates pasados
 */

import React, { useState } from 'react';
import {
  History,
  Calendar,
  Clock,
  ChevronRight,
  MessageSquare,
  Search,
  Filter,
  Trash2,
  Trophy,
} from 'lucide-react';
import { useDebateHistoryStore } from '../../store/debateHistoryStore';
import { DebateHistory } from '../../types';
import { LiquidGlassButton } from '../common';

interface HomeScreenProps {
  onNewDebate: () => void;
  onViewDebate: (debate: DebateHistory) => void;
  onBack?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onViewDebate }) => {
  const { getDebatesSortedByDate, deleteDebate } = useDebateHistoryStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWinner, setFilterWinner] = useState<'all' | 'A' | 'B' | 'draw'>('all');
  const [debateToDelete, setDebateToDelete] = useState<DebateHistory | null>(null);

  const sortedDebates = getDebatesSortedByDate();
  
  const filteredDebates = sortedDebates.filter(debate => {
    const matchesSearch = debate.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debate.teamAName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         debate.teamBName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterWinner === 'all' || debate.winner === filterWinner;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  const getWinnerText = (debate: DebateHistory) => {
    if (debate.winner === 'draw') return 'Empate';
    const winnerTeam = debate.winner === 'A' ? debate.teamAName : debate.teamBName;
    return `Ganó: ${winnerTeam}`;
  };

  const getWinnerColor = (winner: string) => {
    switch (winner) {
      case 'A': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'B': return 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20';
      default: return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, debate: DebateHistory) => {
    e.stopPropagation();
    setDebateToDelete(debate);
  };

  const handleConfirmDelete = () => {
    if (debateToDelete) {
      deleteDebate(debateToDelete.id);
      setDebateToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      {/* Header Section */}
      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400/20 to-cyan-400/20 flex items-center justify-center border border-white/10">
                <History className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
              Historial de Debates
            </h1>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Consulta y revisa todos los debates registrados
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Stats Card */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
              <span className="text-2xl font-bold text-white">{sortedDebates.length}</span>
              <span className="text-white/50">{sortedDebates.length === 1 ? 'debate registrado' : 'debates registrados'}</span>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Buscar debates por tema o equipo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-3
                  bg-white/5
                  border border-white/10
                  rounded-xl
                  text-white placeholder-white/40
                  focus:outline-none focus:border-white/30
                  transition-colors
                "
              />
            </div>
            
            <div className="relative sm:w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <select
                value={filterWinner}
                onChange={(e) => setFilterWinner(e.target.value as any)}
                className="
                  w-full pl-10 pr-8 py-3
                  bg-white/5
                  border border-white/10
                  rounded-xl
                  text-white
                  focus:outline-none focus:border-white/30
                  appearance-none cursor-pointer
                "
              >
                <option value="all" className="bg-slate-900">Todos los resultados</option>
                <option value="A" className="bg-slate-900">Ganó Equipo A</option>
                <option value="B" className="bg-slate-900">Ganó Equipo B</option>
                <option value="draw" className="bg-slate-900">Empates</option>
              </select>
            </div>
          </div>

          {/* Debates List */}
          <div className="
            bg-[#1a1f2e]
            border border-white/10
            rounded-3xl
            shadow-[0_8px_32px_rgba(0,0,0,0.3)]
            overflow-hidden
          ">
            {/* List Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-white/60" />
                <h2 className="text-lg font-semibold text-white">
                  {filteredDebates.length} {filteredDebates.length === 1 ? 'debate' : 'debates'}
                </h2>
              </div>
            </div>

            {/* Debates */}
            <div className="divide-y divide-white/5">
              {filteredDebates.length === 0 ? (
                <div className="p-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                    <MessageSquare className="w-10 h-10 text-white/30" />
                  </div>
                  <p className="text-white/50 text-lg mb-2">
                    {searchTerm || filterWinner !== 'all' 
                      ? 'No se encontraron debates con esos filtros'
                      : 'No hay debates registrados'}
                  </p>
                  <p className="text-white/30 text-sm">
                    {searchTerm || filterWinner !== 'all' 
                      ? 'Intenta con otros términos de búsqueda'
                      : 'Los debates que registres aparecerán aquí'}
                  </p>
                </div>
              ) : (
                filteredDebates.map((debate) => (
                  <div
                    key={debate.id}
                    className="group relative"
                  >
                    <button
                      onClick={() => onViewDebate(debate)}
                      className="
                        w-full p-6
                        hover:bg-white/5
                        transition-colors
                        text-left
                      "
                    >
                      <div className="flex items-start justify-between gap-4 pr-12">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white mb-3 truncate">
                            {debate.topic}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-white/50">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-4 h-4" />
                              {formatDate(debate.date)}
                            </span>
                            
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" />
                              {formatDuration(debate.duration)}
                            </span>
                            
                            <span className="text-white/30">
                              {debate.teamAName} vs {debate.teamBName}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getWinnerColor(debate.winner)}`}>
                            {getWinnerText(debate)}
                          </span>
                          
                          <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-white/60 transition-colors" />
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={(e) => handleDeleteClick(e, debate)}
                      className="
                        absolute right-4 top-1/2 -translate-y-1/2
                        p-2
                        text-white/30 hover:text-[#FF6B00]
                        hover:bg-[#FF6B00]/10
                        rounded-lg
                        transition-all
                        opacity-0 group-hover:opacity-100
                      "
                      title="Eliminar debate"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Delete Modal */}
      {debateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDebateToDelete(null)}
          />
          <div className="
            relative w-full max-w-md
            backdrop-blur-2xl
            bg-black/40
            border border-white/10
            rounded-3xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            p-6
          ">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FF6B00]/20 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Eliminar Debate</h3>
                <p className="text-white/50 text-sm">Esta acción no se puede deshacer</p>
              </div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 mb-6">
              <p className="text-white font-medium mb-1">{debateToDelete.topic}</p>
              <p className="text-white/50 text-sm">
                {debateToDelete.teamAName} vs {debateToDelete.teamBName}
              </p>
            </div>

            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => setDebateToDelete(null)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </LiquidGlassButton>
              
              <LiquidGlassButton
                onClick={handleConfirmDelete}
                variant="danger"
                className="flex-1"
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

export default HomeScreen;
