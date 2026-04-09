/**
 * DashboardScreen - Pantalla principal unificada
 */

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { GlassNavbar } from '../common';
import { Plus, FolderOpen } from 'lucide-react';

interface DashboardScreenProps {
  onNewDebate: () => void;
  onAnalyzeRecorded: () => void;
  onViewHistory: () => void;
  onGoToLanding?: () => void;
  onGoToSettings?: () => void;
  onNewLiveDebate?: () => void;
  onNewAnalysis?: () => void;
  onViewDebates?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNewDebate,
  onViewHistory,
  onGoToLanding,
  onGoToSettings,
  onViewDebates,
}) => {
  const { user } = useAuthStore();

  const menuItems = [
    {
      id: 'new-debate',
      title: 'Nuevo Debate',
      icon: <Plus className="w-12 h-12" />,
      color: 'from-white/40 to-white/10',
      onClick: onNewDebate,
    },
    {
      id: 'debates',
      title: 'Debates Anteriores',
      icon: <FolderOpen className="w-12 h-12" />,
      color: 'from-white/50 to-white/15',
      onClick: onViewDebates || onViewHistory,
    },
  ];

  return (
    <div className="app-shell overflow-y-auto">
      <GlassNavbar
        title="CiceronIA"
        onTitleClick={onGoToLanding}
        onSettingsClick={onGoToSettings}
      />

      <div className="pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Panel de Control
            </h1>
            <p className="text-xl text-white/55 max-w-2xl mx-auto">
              {user?.name ? `Bienvenido, ${user.name}` : 'Gestiona tus debates'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="group relative overflow-hidden rounded-3xl bg-white/[0.035] border border-white/10 p-10 min-h-[220px] transition-all duration-300 hover:bg-white/[0.055] hover:border-white/15 hover:-translate-y-1"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`}
                />

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className={`text-white bg-gradient-to-br ${item.color} bg-clip-text`}>
                      {item.icon}
                    </div>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {item.title}
                  </h3>
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
