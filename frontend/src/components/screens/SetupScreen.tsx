/**
 * SetupScreen - Pantalla de configuración inicial del debate
 */

import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { useDebateStore } from '../../store/debateStore';
import { DebateConfig } from '../../types';

interface SetupScreenProps {
  onStartDebate: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartDebate }) => {
  const { initializeDebate, config } = useDebateStore();

  const [formData, setFormData] = useState<DebateConfig>({
    teamAName: config.teamAName,
    teamBName: config.teamBName,
    debateTopic: config.debateTopic,
    roundDurations: { ...config.roundDurations },
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    key: keyof DebateConfig
  ) => {
    if (key === 'roundDurations') return;
    setFormData({ ...formData, [key]: e.target.value });
  };

  const handleDurationChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    roundType: keyof DebateConfig['roundDurations']
  ) => {
    setFormData({
      ...formData,
      roundDurations: {
        ...formData.roundDurations,
        [roundType]: Math.max(30, parseInt(e.target.value) || 0),
      },
    });
  };

  const handleStart = () => {
    initializeDebate(formData);
    onStartDebate();
  };

  return (
    <div className="cinema-background">
      <div className="relative z-10 h-full flex items-center justify-center p-6">
        {/* Container principal */}
        <div className="w-full max-w-4xl">
          {/* Encabezado */}
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-white to-blue-400 mb-2">
              COMPETICIÓN DE DEBATE
            </h1>
            <p className="text-gray-400 text-lg">Configuración Inicial</p>
          </div>

          {/* Formulario */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Equipo A */}
            <div
              className="p-6 rounded-2xl border-4 border-red-600/50"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 0, 0, 0.2) 0%, rgba(26, 31, 58, 0.4) 100%)',
              }}
            >
              <label className="block text-red-300 text-sm font-semibold mb-2 uppercase">
                Nombre Equipo A
              </label>
              <input
                type="text"
                value={formData.teamAName}
                onChange={(e) => handleInputChange(e, 'teamAName')}
                className="input-field w-full mb-4"
                placeholder="Ej: Rojos"
              />
              <p className="text-xs text-gray-500 mt-2">Equipo a favor del debate</p>
            </div>

            {/* Equipo B */}
            <div
              className="p-6 rounded-2xl border-4 border-blue-600/50"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 26, 77, 0.2) 0%, rgba(26, 31, 58, 0.4) 100%)',
              }}
            >
              <label className="block text-blue-300 text-sm font-semibold mb-2 uppercase">
                Nombre Equipo B
              </label>
              <input
                type="text"
                value={formData.teamBName}
                onChange={(e) => handleInputChange(e, 'teamBName')}
                className="input-field w-full mb-4"
                placeholder="Ej: Azules"
              />
              <p className="text-xs text-gray-500 mt-2">Equipo en contra del debate</p>
            </div>

            {/* Tema (ancho completo) */}
            <div className="col-span-2">
              <label className="block text-purple-300 text-sm font-semibold mb-2 uppercase">
                Tema del Debate
              </label>
              <textarea
                value={formData.debateTopic}
                onChange={(e) => handleInputChange(e, 'debateTopic')}
                className="input-field w-full resize-none h-16"
                placeholder="Ingrese el tema principal del debate"
              />
            </div>
          </div>

          {/* Configuración de tiempos */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-white mb-4 text-center uppercase">
              ⏱️ Duraciones de Rondas (segundos)
            </h3>

            <div className="grid grid-cols-4 gap-4">
              {/* Introducción */}
              <div className="p-4 rounded-lg border-2 border-gray-600 bg-dark-card">
                <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase">
                  Introducción
                </label>
                <input
                  type="number"
                  value={formData.roundDurations.introduccion}
                  onChange={(e) => handleDurationChange(e, 'introduccion')}
                  min="30"
                  className="input-field w-full text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">Por equipo</p>
              </div>

              {/* Primer Refutador */}
              <div className="p-4 rounded-lg border-2 border-gray-600 bg-dark-card">
                <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase">
                  Primer Refutador
                </label>
                <input
                  type="number"
                  value={formData.roundDurations.primerRefutador}
                  onChange={(e) => handleDurationChange(e, 'primerRefutador')}
                  min="30"
                  className="input-field w-full text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">Por equipo</p>
              </div>

              {/* Segundo Refutador */}
              <div className="p-4 rounded-lg border-2 border-gray-600 bg-dark-card">
                <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase">
                  Segundo Refutador
                </label>
                <input
                  type="number"
                  value={formData.roundDurations.segundoRefutador}
                  onChange={(e) => handleDurationChange(e, 'segundoRefutador')}
                  min="30"
                  className="input-field w-full text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">Por equipo</p>
              </div>

              {/* Conclusión */}
              <div className="p-4 rounded-lg border-2 border-gray-600 bg-dark-card">
                <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase">
                  Conclusión
                </label>
                <input
                  type="number"
                  value={formData.roundDurations.conclusion}
                  onChange={(e) => handleDurationChange(e, 'conclusion')}
                  min="30"
                  className="input-field w-full text-center"
                />
                <p className="text-xs text-gray-500 mt-2 text-center">Por equipo</p>
              </div>
            </div>
          </div>

          {/* Botón de inicio */}
          <div className="text-center">
            <button
              onClick={handleStart}
              className={`
                flex items-center justify-center gap-3 mx-auto
                px-12 py-4 rounded-lg font-bold text-lg
                transition-smooth border-2
                bg-gradient-to-r from-blue-600 to-blue-700
                border-blue-500 text-white
                hover:from-blue-500 hover:to-blue-600
                hover:shadow-glow-blue
                active:scale-95
              `}
            >
              <Play size={24} />
              INICIAR DEBATE
            </button>
          </div>

          {/* Información adicional */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>Total de rondas: 8 intervenciones</p>
            <p className="mt-1">
              Tiempo total estimado:{' '}
              {(
                (formData.roundDurations.introduccion * 2 +
                  formData.roundDurations.primerRefutador * 2 +
                  formData.roundDurations.segundoRefutador * 2 +
                  formData.roundDurations.conclusion * 2) /
                60
              ).toFixed(1)}{' '}
              minutos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
