/**
 * AnalysisSetupScreen - Configuración del debate para análisis de grabados
 * Similar a SetupScreen pero específico para análisis de audios
 */

import React, { useState } from 'react';
import { ArrowLeft, Users, FileText, BookOpen, ArrowRight } from 'lucide-react';
import { useProjectStore } from '../../store';
import { LiquidGlassButton } from '../common';

interface AnalysisSetupScreenProps {
  onConfigured: (config: {
    teamAName: string;
    teamBName: string;
    debateTopic: string;
    debateType: string;
  }) => void;
  onBack: () => void;
}

export const AnalysisSetupScreen: React.FC<AnalysisSetupScreenProps> = ({
  onConfigured,
  onBack,
}) => {
  const { debateTypes, selectedDebateType, selectDebateType, fetchDebateTypes } = useProjectStore();
  const [error, setError] = useState('');
  const [selectedType, setSelectedType] = useState('upct');

  const [formData, setFormData] = useState({
    teamAName: 'Equipo A',
    teamBName: 'Equipo B',
    debateTopic: '',
  });

  // Cargar tipos de debate si no están cargados
  React.useEffect(() => {
    if (debateTypes.length === 0) {
      fetchDebateTypes();
    }
  }, [debateTypes.length, fetchDebateTypes]);

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
    
    onConfigured({
      teamAName: formData.teamAName,
      teamBName: formData.teamBName,
      debateTopic: formData.debateTopic,
      debateType: selectedType,
    });
  };

  const selectedTypeData = debateTypes.find(t => t.id === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      <main className="pb-24 px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <button
              onClick={onBack}
              className="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver</span>
            </button>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3 tracking-tight">
              Configurar Análisis
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
                  {debateTypes.length === 0 ? (
                    <div className="text-center py-8 text-white/50">Cargando tipos de debate...</div>
                  ) : (
                    debateTypes.map((type) => (
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
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            type.id === 'upct' 
                              ? 'bg-gradient-to-br from-blue-500 to-cyan-600' 
                              : 'bg-gradient-to-br from-orange-500 to-red-600'
                          }`}>
                            <span className="text-white font-bold text-lg">{type.id === 'upct' ? 'A' : 'R'}</span>
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-bold text-white">{type.nombre}</h3>
                              {selectedType === type.id && (
                                <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full text-white">Seleccionado</span>
                              )}
                            </div>
                            <p className="text-white/60 text-sm">{type.descripcion}</p>
                            
                            {type.fases && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {type.fases.map((fase, idx) => (
                                  <span key={idx} className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded">
                                    {fase.nombre}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Resumen del formato seleccionado */}
              {selectedTypeData?.fases && (
                <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Estructura: {selectedTypeData.nombre}
                  </h3>
                  
                  <div className="space-y-3">
                    {selectedTypeData.fases.map((fase, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
                            {idx + 1}
                          </div>
                          <span className="text-white text-sm">{fase.nombre}</span>
                        </div>
                        <span className="text-white/40 text-xs">
                          {Math.floor(fase.tiempo_segundos / 60)} min
                        </span>
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
              <ArrowRight className="w-5 h-5" />
              <span>Continuar</span>
            </LiquidGlassButton>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AnalysisSetupScreen;
