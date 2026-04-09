/**
 * DebateModeScreen - Seleccion entre Debate En Vivo o Analizar Grabacion
 */

import React from 'react';
import { GlassNavbar } from '../common';
import { Mic, Upload } from 'lucide-react';

interface DebateModeScreenProps {
  onSelectLive: () => void;
  onSelectRecorded: () => void;
  onBack: () => void;
}

export const DebateModeScreen: React.FC<DebateModeScreenProps> = ({
  onSelectLive,
  onSelectRecorded,
  onBack,
}) => {
  const modes = [
    {
      id: 'live',
      title: 'Debate en Vivo',
      icon: <Mic className="w-12 h-12" />,
      color: 'from-white/40 to-white/10',
      onClick: onSelectLive,
    },
    {
      id: 'recorded',
      title: 'Analizar Grabacion',
      icon: <Upload className="w-12 h-12" />,
      color: 'from-white/40 to-white/10',
      onClick: onSelectRecorded,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.95),rgba(2,6,23,1)_58%)] overflow-y-auto">
      <GlassNavbar title="CiceronIA" onTitleClick={onBack} />

      <div className="pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Nuevo Debate
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={mode.onClick}
                className="group relative overflow-hidden rounded-3xl bg-white/[0.035] border border-white/10 p-10 min-h-[220px] transition-all duration-300 hover:bg-white/[0.055] hover:border-white/15 hover:-translate-y-1"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`}
                />

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 rounded-2xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-white mb-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <div className={`text-white bg-gradient-to-br ${mode.color} bg-clip-text`}>
                      {mode.icon}
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                    {mode.title}
                  </h2>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateModeScreen;
