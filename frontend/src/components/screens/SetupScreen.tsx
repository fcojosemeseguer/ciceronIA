/**
 * SetupScreen - Pantalla de configuración inicial del debate
 * Permite configurar equipos, tema y seleccionar tipo de debate
 */

import React, { useState } from 'react';
import { Play, Users, FileText, Clock, BookOpen } from 'lucide-react';
import { useDebateStore } from '../../store/debateStore';
import { LiquidGlassButton } from '../common';

interface SetupScreenProps {
  onStartDebate: () => void;
  onBack: () => void;
}

// Mapeo de tipos de debate
const DEBATE_TYPES = [
  {
    id: 'upct',
    name: 'Académico',
    description: 'Formato tradicional con 4 rondas estructuradas: Introducción, Refutación 1, Refutación 2 y Conclusión.',
    rounds: [
      { name: 'Introducción', time: '3 min', speakers: '1 por equipo' },
      { name: 'Refutación 1', time: '4 min', speakers: '1 por equipo' },
      { name: 'Refutación 2', time: '4 min', speakers: '1 por equipo' },
      { name: 'Conclusión', time: '3 min', speakers: '1 por equipo' },
    ],
    color: 'from-blue-500 to-cyan-600',
    features: ['Estructura clásica', 'Tiempos fijos por orador', 'Evaluación por rondas'],
  },
  {
    id: 'retor',
    name: 'RETOR',
    description: 'Formato dinámico con gestión libre del tiempo por equipo. Fases: Contextualización, Definición, Valoración y Conclusión.',
    rounds: [
      { name: 'Contextualización', time: '6 min', speakers: 'Equipo (libre)' },
      { name: 'Definición', time: '2 min', speakers: 'Equipo (libre)' },
      { name: 'Valoración', time: '5 min', speakers: 'Equipo (libre)' },
      { name: 'Conclusión', time: '3 min', speakers: '1 por equipo' },
    ],
    color: 'from-orange-500 to-red-600',
    features: ['Gestión libre de tiempo', 'Minuto de oro disponible', 'Mayor flexibilidad'],
  },
];

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartDebate, onBack }) => {
  const { initializeDebate } = useDebateStore();
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('upct');

  const [formData, setFormData] = useState({
    teamAName: 'Equipo A',
    teamBName: 'Equipo B',
    debateTopic: '',
    debateDescription: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    key: string
  ) => {
    setFormData({ ...formData, [key]: e.target.value });
    if (error) setError('');
  };

  const handleStart = () => {
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
    
    // Configurar duraciones según el tipo de debate seleccionado
    const roundDurations = selectedType === 'upct' 
      ? {
          introduccion: 180,      // 3 minutos
          primerRefutador: 240,   // 4 minutos
          segundoRefutador: 240,  // 4 minutos
          conclusion: 180,        // 3 minutos
        }
      : {
          introduccion: 360,      // 6 minutos (Contextualización)
          primerRefutador: 120,   // 2 minutos (Definición)
          segundoRefutador: 300,  // 5 minutos (Valoración)
          conclusion: 180,        // 3 minutos
        };
    
    // Inicializar debate con tipo seleccionado
    const debateConfig = {
      teamAName: formData.teamAName,
      teamBName: formData.teamBName,
      debateTopic: formData.debateTopic,
      roundDurations,
    };
    
    initializeDebate(debateConfig);
    setTimeout(() => {
      onStartDebate();
    }, 100);
  };

  const selectedTypeData = DEBATE_TYPES.find(t => t.id === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <main className="pb-32 px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
              Configurar Debate
            </h1>
            <p className="text-white/60 text-lg">Define los equipos, el tema y selecciona el formato</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Columna izquierda - Configuración básica */}
            <div className="space-y-6">
              {/* Sección de Equipos */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Equipos</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#FF6B00] text-sm font-medium mb-2">
                      Equipo A (A favor)
                    </label>
                    <input
                      type="text"
                      value={formData.teamAName}
                      onChange={(e) => handleInputChange(e, 'teamAName')}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                      placeholder="Nombre del equipo"
                    />
                  </div>

                  <div>
                    <label className="block text-[#00E5FF] text-sm font-medium mb-2">
                      Equipo B (En contra)
                    </label>
                    <input
                      type="text"
                      value={formData.teamBName}
                      onChange={(e) => handleInputChange(e, 'teamBName')}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                      placeholder="Nombre del equipo"
                    />
                  </div>
                </div>
              </div>

              {/* Sección de Tema */}
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Tema del Debate</h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Tema <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.debateTopic}
                      onChange={(e) => handleInputChange(e, 'debateTopic')}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="Ej: ¿Debería implementarse la jornada laboral de 4 días?"
                    />
                  </div>

                  <div>
                    <label className="block text-white/60 text-sm font-medium mb-2">
                      Descripción (opcional)
                    </label>
                    <textarea
                      value={formData.debateDescription}
                      onChange={(e) => handleInputChange(e, 'debateDescription')}
                      rows={3}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
                      placeholder="Contexto o descripción adicional del debate..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Columna derecha - Tipo de debate */}
            <div className="space-y-6">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Tipo de Debate</h2>
                </div>

                <div className="space-y-4">
                  {DEBATE_TYPES.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${
                        selectedType === type.id
                          ? 'bg-white/10 border-white/30'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center flex-shrink-0`}>
                          <Clock className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-bold text-white">{type.name}</h3>
                            {selectedType === type.id && (
                              <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full text-white">Seleccionado</span>
                            )}
                          </div>
                          <p className="text-white/60 text-sm mb-3">{type.description}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {type.features.map((feature, idx) => (
                              <span key={idx} className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resumen del formato seleccionado */}
              {selectedTypeData && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Estructura: {selectedTypeData.name}
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedTypeData.rounds.map((round, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                            {idx + 1}
                          </div>
                          <span className="text-white text-sm">{round.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-white/60">{round.time}</span>
                          <span className="text-white/40 text-xs">{round.speakers}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="mt-10 flex gap-4 max-w-md mx-auto">
            <LiquidGlassButton
              onClick={onBack}
              variant="secondary"
              className="flex-1"
            >
              Cancelar
            </LiquidGlassButton>
            
            <LiquidGlassButton
              onClick={handleStart}
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

export default SetupScreen;
