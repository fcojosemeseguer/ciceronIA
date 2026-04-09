/**
 * DebateConfigScreen - Configuracion unificada para debates en vivo y analisis.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Mic, FileAudio, Loader2, LayoutTemplate, Shield, MessageSquare } from 'lucide-react';
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
    team_a_name: 'A favor',
    team_b_name: 'En contra',
    debate_topic: '',
    mode,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchDebateTypes();
  }, [fetchDebateTypes]);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, mode }));
  }, [mode]);

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const surfaceClasses = 'rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_24px_60px_rgba(2,6,23,0.32)]';
  const pageTitle = mode === 'live' ? 'Configurar Debate en Vivo' : 'Configurar Análisis de Grabación';
  const pageDescription = mode === 'live'
    ? 'Misma estructura, mismos campos y listo para empezar en directo.'
    : 'Misma estructura, mismos campos y listo para subir los audios del debate.';
  const submitLabel = mode === 'live' ? 'Iniciar debate' : 'Continuar al análisis';
  const modeLabel = mode === 'live' ? 'Debate en vivo' : 'Analizar grabación';
  const modeIcon = mode === 'live'
    ? <Mic className="h-5 w-5 text-white/80" />
    : <FileAudio className="h-5 w-5 text-white/80" />;

  const activeError = formError || error;

  const selectedDebateTypeDescription = useMemo(() => {
    return debateTypes.find((debateType) => debateType.id === formData.debate_type)?.descripcion || '';
  }, [debateTypes, formData.debate_type]);

  const handleFieldChange = (field: keyof CreateDebateData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) {
      setFormError('');
    }
    if (error) {
      clearError();
    }
  };

  const failWith = (message: string) => {
    setFormError(message);
    scrollToTop();
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      failWith('Debes ingresar un nombre para el debate');
      return;
    }

    if (!formData.debate_topic.trim()) {
      failWith('Debes ingresar un tema para el debate');
      return;
    }

    if (!formData.team_a_name.trim()) {
      failWith('Debes ingresar el nombre de la postura a favor');
      return;
    }

    if (!formData.team_b_name.trim()) {
      failWith('Debes ingresar el nombre de la postura en contra');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const payload: CreateDebateData = {
        ...formData,
        name: formData.name.trim(),
      };
      const newDebate = await createDebate(payload);

      if (mode === 'live') {
        onStartLive(newDebate);
      } else {
        onStartAnalysis(newDebate);
      }
    } catch (submissionError) {
      console.error('Error al crear el debate:', submissionError);
      failWith('Error al crear el debate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell overflow-y-auto">
      <div className="px-4 py-6 pb-36 sm:px-6 sm:pb-40 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={onBack}
              className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="h-6 w-6 text-white/70" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-white/55">
                {modeIcon}
                {modeLabel}
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">{pageTitle}</h1>
              <p className="mt-2 text-white/50">{pageDescription}</p>
            </div>
          </div>

          {activeError && (
            <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200">
              {activeError}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <section className={`${surfaceClasses} p-6 sm:p-8`}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <MessageSquare className="h-5 w-5 text-white/75" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Datos del debate</h2>
                  <p className="text-sm text-white/45">La misma estructura en ambos modos.</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Nombre del debate <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition-colors focus:border-white/30"
                    placeholder="Ej: Semifinal UPCT 2026"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">
                    Tema del debate <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.debate_topic}
                    onChange={(e) => handleFieldChange('debate_topic', e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition-colors focus:border-white/30"
                    placeholder="Ej: ¿Debería implementarse la jornada laboral de 4 días?"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm text-white/70">
                      A favor <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.team_a_name}
                      onChange={(e) => handleFieldChange('team_a_name', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition-colors focus:border-white/30"
                      placeholder="Nombre de la postura a favor"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-white/70">
                      En contra <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.team_b_name}
                      onChange={(e) => handleFieldChange('team_b_name', e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition-colors focus:border-white/30"
                      placeholder="Nombre de la postura en contra"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm text-white/70">Descripción (opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/25 outline-none transition-colors focus:border-white/30"
                    placeholder="Notas adicionales sobre el debate, participantes o contexto."
                  />
                </div>
              </div>
            </section>

            <section className={`${surfaceClasses} p-6 sm:p-8`}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <LayoutTemplate className="h-5 w-5 text-white/75" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Formato</h2>
                  <p className="text-sm text-white/45">Misma presentación para vivo y grabación.</p>
                </div>
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm text-white/70">Tipo de debate</label>
                <select
                  value={formData.debate_type}
                  onChange={(e) => handleFieldChange('debate_type', e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors focus:border-white/30"
                  style={{ backgroundImage: 'none' }}
                >
                  {debateTypes.map((debateType) => (
                    <option key={debateType.id} value={debateType.id} className="bg-slate-900">
                      {debateType.nombre}
                    </option>
                  ))}
                  {debateTypes.length === 0 && (
                    <>
                      <option value="upct" className="bg-slate-900">I Torneo UPCT</option>
                      <option value="retor" className="bg-slate-900">Formato RETOR</option>
                    </>
                  )}
                </select>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 text-white/65" />
                  <div>
                    <p className="text-sm font-medium text-white">Información del formato</p>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {selectedDebateTypeDescription || 'Selecciona un formato para ver su descripción.'}
                    </p>
                  </div>
                </div>
              </div>

            </section>
          </div>

          <div className="mx-auto mt-8 flex max-w-xl flex-col gap-4 sm:flex-row">
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
              variant="success"
              className="flex-1 bg-gradient-to-br from-emerald-500/80 to-emerald-700/60 hover:from-emerald-500/90 hover:to-emerald-700/70 border-emerald-300/30 shadow-[0_10px_34px_rgba(16,185,129,0.28)] hover:shadow-[0_14px_40px_rgba(16,185,129,0.38)]"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Iniciando...
                </span>
              ) : (
                submitLabel
              )}
            </LiquidGlassButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateConfigScreen;
