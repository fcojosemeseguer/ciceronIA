/**
 * DebateConfigScreen - Pantalla de configuración unificada para nuevos debates
 * 
 * Esta pantalla reemplaza el modal de creación de proyectos.
 * Se muestra cuando el usuario quiere iniciar un nuevo debate (análisis o en vivo).
 * 
 * Props:
 * - mode: 'live' | 'analysis' - Determina el modo del debate
 * - onBack: () => void - Volver atrás
 * - onStartLive: (debate: Debate) => void - Iniciar debate en vivo
 * - onStartAnalysis: (debate: Debate) => void - Iniciar análisis de audio
 */

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Mic, FileAudio, Loader2, Info } from 'lucide-react';
import { useUnifiedDebateStore } from '../../store';
import { CreateDebateData, DebateMode, Debate } from '../../types';
import { LiquidGlassButton } from '../common';

interface DebateConfigScreenProps {
  mode: DebateMode;
  onBack: () => void;
  onStartLive: (debate: Debate) => void;
  onStartAnalysis: (debate: Debate) => void;
}

export const DebateConfigScreen: React.FC<DebateConfigScreenProps> = ({
  mode,
  onBack,
  onStartLive,
  onStartAnalysis,
}) => {
  const {
    debateTypes,
    isLoading,
    error,
    fetchDebateTypes,
    createDebate,
    clearError,
  } = useUnifiedDebateStore();

  const [formData, setFormData] = useState<CreateDebateData>({
    name: '',
    description: '',
    debate_type: 'upct',
    team_a_name: 'Equipo A',
    team_b_name: 'Equipo B',
    debate_topic: '',
    mode: mode,
  });
  
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDebateTypes();
  }, [fetchDebateTypes]);

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.name.trim()) {
      setFormError('El nombre del debate es obligatorio');
      return;
    }

    if (!formData.debate_topic.trim()) {
      setFormError('El tema del debate es obligatorio');
      return;
    }

    if (!formData.team_a_name.trim() || !formData.team_b_name.trim()) {
      setFormError('Los nombres de ambos equipos son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const debateCode = await createDebate(formData);
      
      // Obtener el debate recién creado del store
      const newDebate = useUnifiedDebateStore.getState().debates.find(
        d => d.code === debateCode
      );
      
      if (newDebate) {
        if (mode === 'live') {
          onStartLive(newDebate);
        } else {
          onStartAnalysis(newDebate);
        }
      } else {
        setFormError('Error al crear el debate. Inténtalo de nuevo.');
      }
    } catch (err) {
      setFormError('Error al crear el debate');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLiveMode = mode === 'live';
  const pageTitle = isLiveMode ? 'Nuevo Debate en Vivo' : 'Analizar Grabación';
  const pageDescription = isLiveMode 
    ? 'Configura los equipos y el tema para comenzar el debate' 
    : 'Configura el debate para analizar la grabación de audio';
  const submitButtonText = isLiveMode ? 'Iniciar Debate' : 'Continuar al Análisis';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-white/70" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                {isLiveMode ? (
                  <Mic className="w-8 h-8 text-[#00E5FF]" />
                ) : (
                  <FileAudio className="w-8 h-8 text-[#00E5FF]" />
                )}
                {pageTitle}
              </h1>
              <p className="text-white/50 mt-1">{pageDescription}</p>
            </div>
          </div>

          {/* Error global */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Formulario */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
            <div className="space-y-6">
              {/* Nombre del debate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Nombre del debate <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormError('');
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                  placeholder="Ej: Torneo UPCT 2024 - Semifinal"
                />
              </div>

              {/* Tema del debate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Tema del debate <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.debate_topic}
                  onChange={(e) => {
                    setFormData({ ...formData, debate_topic: e.target.value });
                    setFormError('');
                  }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                  placeholder="Ej: ¿Debería implementarse la jornada laboral de 4 días?"
                />
              </div>

              {/* Equipos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#FF6B00] mb-2">
                    Equipo A (A favor) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.team_a_name}
                    onChange={(e) => {
                      setFormData({ ...formData, team_a_name: e.target.value });
                      setFormError('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#FF6B00]/50 transition-colors"
                    placeholder="Nombre del equipo A"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#00E5FF] mb-2">
                    Equipo B (En contra) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.team_b_name}
                    onChange={(e) => {
                      setFormData({ ...formData, team_b_name: e.target.value });
                      setFormError('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF]/50 transition-colors"
                    placeholder="Nombre del equipo B"
                  />
                </div>
              </div>

              {/* Tipo de debate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Formato de debate
                </label>
                <select
                  value={formData.debate_type}
                  onChange={(e) => setFormData({ ...formData, debate_type: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#00E5FF]/50 transition-colors appearance-none cursor-pointer"
                  style={{ backgroundImage: 'none' }}
                >
                  {debateTypes.map((dt) => (
                    <option key={dt.id} value={dt.id} className="bg-slate-900">
                      {dt.nombre}
                    </option>
                  ))}
                  {debateTypes.length === 0 && (
                    <>
                      <option value="upct" className="bg-slate-900">I Torneo UPCT</option>
                      <option value="retor" className="bg-slate-900">Formato RETOR</option>
                    </>
                  )}
                </select>
                {debateTypes.length > 0 && (
                  <p className="mt-2 text-sm text-white/40">
                    {debateTypes.find(dt => dt.id === formData.debate_type)?.descripcion}
                  </p>
                )}
              </div>

              {/* Descripción opcional */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#00E5FF]/50 transition-colors resize-none"
                  rows={3}
                  placeholder="Notas adicionales sobre el debate, participantes, ubicación, etc."
                />
              </div>

              {/* Info box según modo */}
              <div className="p-4 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#00E5FF] flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-white/70">
                    {isLiveMode ? (
                      <>
                        <strong className="text-white">Debate en Vivo:</strong> Se iniciará un temporizador 
                        con las rondas configuradas. Las intervenciones se grabarán automáticamente y se 
                        podrán analizar en tiempo real. El debate se guardará en tu historial al finalizar.
                      </>
                    ) : (
                      <>
                        <strong className="text-white">Análisis de Grabación:</strong> Podrás subir 
                        archivos de audio para cada fase del debate. El sistema analizará automáticamente 
                        cada intervención y generará un informe completo con puntuaciones y feedback.
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Error de formulario */}
              {formError && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <LiquidGlassButton
                  onClick={onBack}
                  variant="secondary"
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={handleSubmit}
                  variant="primary"
                  className="flex-1"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creando...
                    </span>
                  ) : (
                    submitButtonText
                  )}
                </LiquidGlassButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateConfigScreen;
