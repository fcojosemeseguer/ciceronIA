/**
 * DashboardScreen - Pantalla principal unificada
 * 3 opciones claras: Nuevo Debate, Analizar Grabado, Historial
 */

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { GlassNavbar } from '../common';
import { Plus, FileAudio, History, Mic, Upload } from 'lucide-react';

interface DashboardScreenProps {
  onNewDebate: () => void;
  onAnalyzeRecorded: () => void;
  onViewHistory: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNewDebate,
  onAnalyzeRecorded,
  onViewHistory,
}) => {
  const { user } = useAuthStore();

  const menuItems = [
    {
      id: 'new-debate',
      title: 'Nuevo Debate',
      description: 'Inicia un debate en vivo o analiza uno grabado',
      icon: <Plus className="w-8 h-8" />,
      color: 'from-cyan-500 to-blue-600',
      onClick: onNewDebate,
    },
    {
      id: 'analyze',
      title: 'Analizar Debate Grabado',
      description: 'Sube audios y obtén análisis detallado con IA',
      icon: <FileAudio className="w-8 h-8" />,
      color: 'from-orange-500 to-red-600',
      onClick: onAnalyzeRecorded,
    },
    {
      id: 'history',
      title: 'Historial de Debates',
      description: 'Revisa debates anteriores y sus evaluaciones',
      icon: <History className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-600',
      onClick: onViewHistory,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <GlassNavbar title="CiceronAI" />
      
      <div className="pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Panel de Control
            </h1>
            <p className="text-xl text-white/60">
              {user?.name ? `Bienvenido, ${user.name}` : 'Gestiona tus debates'}
            </p>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:scale-105"
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-6 shadow-lg`}>
                    {item.icon}
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-3">
                    {item.title}
                  </h3>
                  
                  <p className="text-white/60 text-sm leading-relaxed">
                    {item.description}
                  </p>

                  {/* Arrow indicator */}
                  <div className="mt-6 flex items-center gap-2 text-white/40 group-hover:text-white/80 transition-colors">
                    <span className="text-sm font-medium">Comenzar</span>
                    <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
