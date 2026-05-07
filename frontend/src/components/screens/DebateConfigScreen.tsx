/**
 * DebateConfigScreen - Configuracion unificada para debates en vivo y analisis.
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useUnifiedDebateStore } from '../../store';
import { CreateDebateData, DebateMode, Debate } from '../../types';
import { BrandHeader, Breadcrumbs, LiquidGlassButton } from '../common';
import { saveDebateTeamColors } from '../../utils/debateColors';

interface DebateConfigScreenProps {
  mode: DebateMode;
  onBack: () => void;
  onGoDashboard?: () => void;
  onGoDebateMode?: () => void;
  onStartLive: (debate: Debate) => void;
  onStartAnalysis: (debate: Debate) => void;
}

export const DebateConfigScreen: React.FC<DebateConfigScreenProps> = ({
  mode,
  onBack,
  onGoDashboard,
  onGoDebateMode,
  onStartLive,
  onStartAnalysis,
}) => {
  const {
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
    team_a_name: '',
    team_b_name: '',
    debate_topic: '',
    mode,
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPalette, setSelectedPalette] = useState(0);

  const teamPalettes = [
    { a: '#3A6EA5', b: '#C44536' },
    { a: '#5E8C61', b: '#7B2CBF' },
    { a: '#6C757D', b: '#D62828' },
    { a: '#6B8E23', b: '#983955' },
  ];

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

  const pageTitle = 'Configuracion';
  const submitLabel = 'Iniciar Debate';
  const currentStep = mode === 'live' ? 'Debate en vivo' : 'Analisis de audio';

  const activeError = formError || error;

  const panelColor = mode === 'live' ? 'var(--brand-green)' : 'var(--brand-gold)';
  const labelColor = mode === 'live' ? '#F5F5F3' : 'var(--brand-brown)';
  const mutedTextStyle = { color: labelColor };
  const fieldStyle: React.CSSProperties = {
    borderColor: 'transparent',
    background: '#F5F5F3',
    color: '#2C2C2C',
  };

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
      const selectedColors = teamPalettes[selectedPalette] || teamPalettes[0];
      saveDebateTeamColors(newDebate.code, {
        team_a_color: selectedColors.a,
        team_b_color: selectedColors.b,
      });
      const debateWithColors: Debate = {
        ...newDebate,
        team_a_color: selectedColors.a,
        team_b_color: selectedColors.b,
      };

      if (mode === 'live') {
        onStartLive(debateWithColors);
      } else {
        onStartAnalysis(debateWithColors);
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
      <div className="px-5 py-8 pb-32 sm:px-8">
        <div className="mx-auto w-full max-w-[1040px]">
          <BrandHeader className="mb-8" />
          <Breadcrumbs
            className="mb-4"
            items={[
              { label: 'Panel de Control', onClick: onGoDashboard || onBack },
              { label: 'Nuevo Debate', onClick: onGoDebateMode || onBack },
              { label: currentStep },
            ]}
          />
          <div className="mb-6">
            <h1 className="text-[46px] sm:text-[56px] leading-none text-[#2C2C2C]">{pageTitle}</h1>
          </div>

          {activeError && (
            <div className="mb-6 rounded-xl border border-red-400 bg-red-100 px-5 py-4 text-base text-red-700">
              {activeError}
            </div>
          )}

          <div className="mx-auto max-w-[760px] rounded-[20px] p-4 sm:p-5" style={{ background: panelColor }}>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Nombre debate:
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px] outline-none placeholder:opacity-60"
                  style={fieldStyle}
                  placeholder="Nombre del debate"
                />
              </div>

              <div>
                <label className="mb-1 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Tema:
                </label>
                <input
                  type="text"
                  value={formData.debate_topic}
                  onChange={(e) => handleFieldChange('debate_topic', e.target.value)}
                  className="w-full rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px] outline-none placeholder:opacity-60"
                  style={fieldStyle}
                  placeholder="Tema del debate"
                />
              </div>

              <div>
                <label className="mb-1 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Nombre equipos:
                </label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    value={formData.team_a_name}
                    onChange={(e) => handleFieldChange('team_a_name', e.target.value)}
                    className="w-full rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px] outline-none placeholder:opacity-60"
                    style={fieldStyle}
                    placeholder="Equipo a favor"
                  />
                  <input
                    type="text"
                    value={formData.team_b_name}
                    onChange={(e) => handleFieldChange('team_b_name', e.target.value)}
                    className="w-full rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px] outline-none placeholder:opacity-60"
                    style={fieldStyle}
                    placeholder="Equipo en contra"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Colores equipos:
                </label>
                <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
                  {teamPalettes.map((palette, index) => {
                    const active = selectedPalette === index;
                    return (
                      <button
                        type="button"
                        key={`${palette.a}-${palette.b}`}
                        onClick={() => setSelectedPalette(index)}
                        className="inline-flex h-[44px] w-full items-center justify-center gap-2 rounded-[12px] border px-2"
                        style={{
                          borderColor: active ? '#1C1D1F' : 'rgba(245,245,243,0.55)',
                          background: active ? '#1C1D1F' : '#F5F5F3',
                        }}
                        aria-label={`Paleta ${index + 1}`}
                      >
                        <span className="h-6 w-6 rounded-full" style={{ background: palette.a }} />
                        <span className="h-6 w-6 rounded-full" style={{ background: palette.b }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Formato:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFieldChange('debate_type', 'upct')}
                    className="rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px]"
                    style={{
                      borderColor: 'transparent',
                      background: formData.debate_type === 'upct' ? '#1C1D1F' : '#F5F5F3',
                      color: formData.debate_type === 'upct' ? '#F5F5F3' : '#2C2C2C',
                    }}
                  >
                    ACADEMICO
                  </button>
                  <button
                    type="button"
                    onClick={() => handleFieldChange('debate_type', 'retor')}
                    className="rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px]"
                    style={{
                      borderColor: 'transparent',
                      background: formData.debate_type === 'retor' ? '#1C1D1F' : '#F5F5F3',
                      color: formData.debate_type === 'retor' ? '#F5F5F3' : '#2C2C2C',
                    }}
                  >
                    RETOR
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[22px] font-medium leading-none sm:text-[24px]" style={mutedTextStyle}>
                  Descripcion: <span className="text-[16px] font-medium sm:text-[18px]">(opc)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-[14px] border px-4 py-2.5 text-[18px] sm:text-[20px] outline-none placeholder:opacity-60"
                  style={fieldStyle}
                  placeholder="Descripcion opcional"
                />
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 max-w-[420px]">
            <LiquidGlassButton
              onClick={handleSubmit}
              variant="primary"
              className="w-full rounded-[14px] border-0 py-3.5 text-[28px] font-semibold leading-none text-[#2C2C2C] sm:text-[30px]"
              style={{
                background: mode === 'live' ? 'var(--brand-gold)' : 'var(--brand-green)',
                color: mode === 'live' ? 'var(--brand-brown)' : '#F5F5F3',
              }}
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Iniciando
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
