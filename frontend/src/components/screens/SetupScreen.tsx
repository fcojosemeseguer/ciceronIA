/**
 * SetupScreen - Pantalla de configuración inicial del debate
 * Estilo Aurora con colores naranja/cian
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useDebateStore } from '../../store/debateStore';
import { DebateConfig } from '../../types';
import { LiquidGlassButton } from '../common';

interface SetupScreenProps {
  onStartDebate: () => void;
  onBack: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartDebate, onBack }) => {
  const { initializeDebate } = useDebateStore();
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<DebateConfig>({
    teamAName: 'Equipo A',
    teamBName: 'Equipo B',
    debateTopic: '',
    roundDurations: {
      introduccion: 180,
      primerRefutador: 240,
      segundoRefutador: 240,
      conclusion: 180,
    },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    key: keyof DebateConfig
  ) => {
    if (key === 'roundDurations') return;
    setFormData({ ...formData, [key]: e.target.value });
    if (error) setError('');
  };

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!formData.debateTopic.trim()) {
      setError('Debes ingresar un tema para el debate');
      return;
    }
    
    if (!formData.teamAName.trim()) {
      setError('Debes ingresar el nombre del Equipo A');
      return;
    }
    
    if (!formData.teamBName.trim()) {
      setError('Debes ingresar el nombre del Equipo B');
      return;
    }
    
    initializeDebate(formData);
    setTimeout(() => {
      onStartDebate();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <main className="pb-8 px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2 tracking-tight">
              Configuración del Debate
            </h1>
            <p className="text-white/60">Personaliza los equipos y tiempos</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF6B00]/20 flex items-center justify-center">
                  <span className="text-[#FF6B00] font-bold">A</span>
                </div>
                <div>
                  <p className="text-[#FF6B00] text-sm font-medium">EQUIPO A</p>
                  <p className="text-white/50 text-xs">A favor</p>
                </div>
              </div>

              <input
                type="text"
                value={formData.teamAName}
                onChange={(e) => handleInputChange(e, 'teamAName')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4A5568] transition-colors"
                placeholder="Nombre del equipo"
              />
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 flex items-center justify-center">
                  <span className="text-[#00E5FF] font-bold">B</span>
                </div>
                <div>
                  <p className="text-[#00E5FF] text-sm font-medium">EQUIPO B</p>
                  <p className="text-white/50 text-xs">En contra</p>
                </div>
              </div>

              <input
                type="text"
                value={formData.teamBName}
                onChange={(e) => handleInputChange(e, 'teamBName')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4A5568] transition-colors"
                placeholder="Nombre del equipo"
              />
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <label className="block text-white/80 text-sm font-medium mb-2">
              Tema del Debate <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.debateTopic}
              onChange={(e) => handleInputChange(e, 'debateTopic')}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#4A5568] transition-colors"
              placeholder="Ingresa el tema del debate..."
            />
          </div>

          <div className="flex gap-3">
            <LiquidGlassButton
              onClick={onBack}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </LiquidGlassButton>
            
            <LiquidGlassButton
              onClick={() => handleStart({ preventDefault: () => {} } as React.MouseEvent)}
              variant="primary"
              className="flex-[2]"
            >
              <Play className="w-5 h-5" />
              <span>Iniciar Debate</span>
            </LiquidGlassButton>
          </div>
        </div>
      </main>
    </div>
  );
};
