/**
 * DebateModeScreen - Selección entre Debate En Vivo o Análisis de Grabado
 * Segundo paso después de hacer clic en "Nuevo Debate"
 */

import React from 'react';
import { GlassNavbar } from '../common';
import { Mic, Upload, ArrowLeft } from 'lucide-react';

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
      description: 'Controla tiempos, rondas y grabación en tiempo real. Ideal para eventos presenciales con juez.',
      features: [
        'Timer con cuenta regresiva',
        'Control de rondas automático',
        'Grabación integrada',
        'Evaluación en el momento',
      ],
      icon: <Mic className="w-10 h-10" />,
      color: 'from-cyan-500 to-blue-600',
      bgGlow: 'cyan',
      onClick: onSelectLive,
    },
    {
      id: 'recorded',
      title: 'Analizar Debate Grabado',
      description: 'Sube audios de debates ya realizados y obtén un análisis detallado con IA.',
      features: [
        'Subida de audios WAV',
        'Análisis automático por IA',
        'Evaluación basada en rúbricas',
        'Reportes detallados',
      ],
      icon: <Upload className="w-10 h-10" />,
      color: 'from-orange-500 to-red-600',
      bgGlow: 'orange',
      onClick: onSelectRecorded,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <GlassNavbar title="CiceronAI" />
      
      <div className="pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver al Panel</span>
          </button>

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Selecciona el Modo
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto">
              ¿Cómo deseas trabajar con este debate?
            </p>
          </div>

          {/* Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={mode.onClick}
                className="group relative overflow-hidden rounded-3xl bg-white/5 border border-white/10 p-8 text-left transition-all duration-500 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02]"
              >
                {/* Animated background glow */}
                <div className={`absolute -top-20 -right-20 w-64 h-64 bg-${mode.bgGlow}-500/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-white mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                    {mode.icon}
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-3xl font-bold text-white mb-4">
                    {mode.title}
                  </h2>
                  
                  {/* Description */}
                  <p className="text-white/70 text-lg mb-6 leading-relaxed">
                    {mode.description}
                  </p>
                  
                  {/* Features list */}
                  <ul className="space-y-3 mb-8">
                    {mode.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-white/60">
                        <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${mode.color}`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  {/* CTA Button */}
                  <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${mode.color} text-white font-semibold transform group-hover:translate-x-2 transition-transform duration-300`}>
                    <span>Seleccionar</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

export default DebateModeScreen;
