/**
 * SettingsScreen - Configuración minimalista con solo opciones funcionales.
 */

import React, { useEffect } from 'react';
import {
  AlertCircle,
  Mic,
  RefreshCw,
  Settings,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMicrophoneTest } from '../../hooks/useMicrophoneTest';
import { applyTheme } from '../../utils/theme';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const {
    isTesting,
    hasPermission,
    volume,
    isSpeaking,
    error: micError,
    selectedDevice,
    devices,
    startTest,
    stopTest,
    changeDevice,
  } = useMicrophoneTest();

  useEffect(() => {
    applyTheme('light');
  }, []);

  return (
    <div className="app-shell settings-scope app-fixed-screen">
      <div className="app-fixed-screen__body px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col">
          <div className="mb-6 flex shrink-0 items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="app-panel-strong flex h-12 w-12 items-center justify-center rounded-2xl">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white sm:text-4xl">Configuración</h1>
                <p className="app-text-muted">Solo ajustes útiles y estables</p>
              </div>
            </div>

            <button
              onClick={onBack}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-white transition-colors hover:bg-white/10"
            >
              Volver
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div className="h-full">
              <div className="app-panel min-h-0 h-full rounded-2xl p-6 sm:p-8">
                <div className="h-full overflow-y-auto pr-1">
                  <div className="space-y-6">
                    <h2 className="flex items-center gap-3 text-2xl font-bold text-white">
                      <Mic className="h-6 w-6" />
                      Test de micrófono
                    </h2>

                    <div className="rounded-2xl border border-white/10 bg-slate-800/50 p-6">
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Visualizador de entrada</h3>
                          <p className="text-sm text-white/50">Comprueba el nivel real del micro</p>
                        </div>
                        <button
                          onClick={() => (isTesting ? stopTest() : startTest(selectedDevice))}
                          className={`flex items-center gap-2 rounded-xl border px-6 py-2 font-medium transition-all ${
                            isTesting
                              ? 'border-red-500/30 bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'border-green-500/30 bg-green-500/20 text-green-400 hover:bg-green-500/30'
                          }`}
                        >
                          {isTesting ? (
                            <>
                              <VolumeX className="h-4 w-4" />
                              <span>Detener</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-4 w-4" />
                              <span>Probar micrófono</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="mb-6">
                        <div className="flex h-28 items-end justify-center gap-[2px] rounded-xl bg-slate-900/50 p-4">
                          {Array.from({ length: 36 }).map((_, i) => {
                              const barThreshold = (i / 36) * 100;
                              const isActive = volume > barThreshold;
                              const baseHeight = 8;
                              const maxAdditionalHeight = 92;
                              const heightMultiplier = Math.min(1, volume / 100);
                              const targetHeight = baseHeight + maxAdditionalHeight * heightMultiplier;
                              const waveOffset = Math.sin((i / 36) * Math.PI) * 0.3;
                              const barHeight = isActive
                                ? Math.max(baseHeight, targetHeight * (0.5 + waveOffset))
                                : baseHeight;

                              let barColor = 'bg-slate-700';
                              if (isTesting && isActive) {
                                if (volume > 80) barColor = 'bg-gradient-to-t from-red-500 to-red-400';
                                else if (volume > 50) barColor = 'bg-gradient-to-t from-yellow-400 to-yellow-300';
                                else barColor = 'bg-gradient-to-t from-green-400 to-green-300';
                              }

                              return (
                                <div
                                  key={i}
                                  className={`w-1.5 rounded-full transition-all duration-75 ease-out ${barColor}`}
                                  style={{
                                    height: `${isTesting ? barHeight : baseHeight}%`,
                                    opacity: isActive ? 0.9 + volume / 200 : 0.3,
                                    transform: isSpeaking && isActive ? 'scaleY(1.05)' : 'scaleY(1)',
                                  }}
                                />
                              );
                            })}
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white/60">Nivel de entrada:</span>
                            <span
                              className={`font-mono font-bold ${
                                volume > 50 ? 'text-green-400' : volume > 20 ? 'text-yellow-400' : 'text-slate-400'
                              }`}
                            >
                              {Math.round(volume)}%
                            </span>
                          </div>

                          {isSpeaking && isTesting && (
                            <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1">
                              <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                              <span className="text-sm text-green-400">Hablando</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mb-6">
                        {hasPermission === false && (
                          <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                            <div>
                              <p className="font-medium text-red-400">
                                {micError || 'Permiso de micrófono denegado'}
                              </p>
                              <p className="text-sm text-red-400/70">
                                Haz clic en “Probar micrófono” y permite el acceso cuando el navegador lo solicite.
                              </p>
                            </div>
                          </div>
                        )}

                        {hasPermission === true && isTesting && (
                          <div className="flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4">
                            <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-400" />
                            <p className="text-green-400">Micrófono funcionando correctamente</p>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">
                          Dispositivo de entrada
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedDevice}
                            onChange={(e) => changeDevice(e.target.value)}
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white focus:border-white/30 focus:outline-none"
                          >
                            {devices.length === 0 && (
                              <option value="">No se encontraron dispositivos</option>
                            )}
                            {devices.map((device) => (
                              <option key={device.deviceId} value={device.deviceId}>
                                {device.label || `Micrófono ${device.deviceId.slice(0, 8)}...`}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => window.location.reload()}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-colors hover:bg-white/10"
                            title="Actualizar lista de dispositivos"
                          >
                            <RefreshCw className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
