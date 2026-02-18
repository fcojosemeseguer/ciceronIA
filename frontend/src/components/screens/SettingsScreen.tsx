/**
 * SettingsScreen - Página de configuración
 * Incluye: Perfil, Test de micrófono, Preferencias, Privacidad
 */

import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mic, 
  Volume2, 
  VolumeX, 
  Settings,
  Save,
  Trash2,
  Download,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Bell,
  Moon
} from 'lucide-react';
import { useMicrophoneTest } from '../../hooks/useMicrophoneTest';
import { LiquidGlassButton } from '../common';

interface SettingsScreenProps {
  onBack: () => void;
}

interface AppSettings {
  notificationSounds: boolean;
  theme: 'dark' | 'light' | 'system';
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationSounds: true,
  theme: 'dark',
};

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  // Estados
  const [activeTab, setActiveTab] = useState<'profile' | 'audio' | 'preferences' | 'privacy'>('profile');
  const [username, setUsername] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Hook de test de micrófono
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

  // Cargar configuración guardada
  useEffect(() => {
    const savedSettings = localStorage.getItem('ciceron_settings');
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch {
        console.error('Error loading settings');
      }
    }
    
    const savedUsername = localStorage.getItem('ciceron_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  // Guardar configuración
  const saveSettings = () => {
    localStorage.setItem('ciceron_settings', JSON.stringify(settings));
    localStorage.setItem('ciceron_username', username);
    setSaveMessage('Configuración guardada correctamente');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  // Exportar datos
  const exportData = () => {
    const data = {
      settings,
      username,
      debates: localStorage.getItem('ciceron_debates') || '[]',
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ciceron-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Eliminar todos los datos
  const clearAllData = () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      localStorage.clear();
      setUsername('');
      setSettings(DEFAULT_SETTINGS);
      setSaveMessage('Todos los datos han sido eliminados');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  // Tabs configuration
  const tabs = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'audio', label: 'Audio', icon: Mic },
    { id: 'preferences', label: 'Preferencias', icon: Settings },
    { id: 'privacy', label: 'Privacidad', icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      {/* Header */}
      <div className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-white/10">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Configuración</h1>
                <p className="text-white/60">Personaliza tu experiencia</p>
              </div>
            </div>
            
            <button
              onClick={onBack}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
            >
              Volver
            </button>
          </div>

          {/* Mensaje de guardado */}
          {saveMessage && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-green-400">{saveMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar - Tabs */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-white/10 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{tab.label}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${
                        activeTab === tab.id ? 'rotate-90' : ''
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
                
                {/* Perfil Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <User className="w-6 h-6" />
                      Perfil de Usuario
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Nombre de usuario
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Tu nombre"
                          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                        />
                      </div>
                      
                      <div className="pt-4">
                        <LiquidGlassButton onClick={saveSettings} variant="primary" className="w-full sm:w-auto">
                          <Save className="w-4 h-4" />
                          <span>Guardar perfil</span>
                        </LiquidGlassButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Audio Tab */}
                {activeTab === 'audio' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Mic className="w-6 h-6" />
                      Test de Micrófono
                    </h2>
                    
                    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-lg font-semibold text-white mb-1">Visualizador de Audio</h3>
                          <p className="text-white/50 text-sm">Habla para ver el nivel de entrada</p>
                        </div>
                        <button
                          onClick={() => isTesting ? stopTest() : startTest(selectedDevice)}
                          className={`px-6 py-2 rounded-xl font-medium transition-all flex items-center gap-2 ${
                            isTesting
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                          }`}
                        >
                          {isTesting ? (
                            <><VolumeX className="w-4 h-4" /><span>Detener</span></>
                          ) : (
                            <><Volume2 className="w-4 h-4" /><span>Probar micrófono</span></>
                          )}
                        </button>
                      </div>

                      {/* Visualizador de barras tipo Discord - Dinámico */}
                      
                      <div className="mb-6">
                        <div className="flex items-end justify-center gap-[2px] h-32 bg-slate-900/50 rounded-xl p-4">
                          {Array.from({ length: 40 }).map((_, i) => {
                            // Calcular umbral para esta barra (de izquierda a derecha)
                            const barThreshold = (i / 40) * 100;
                            
                            // La barra se ilumina si el volumen supera su umbral
                            const isActive = volume > barThreshold;
                            
                            // Altura base más altura adicional según volumen
                            const baseHeight = 8;
                            const maxAdditionalHeight = 92;
                            const heightMultiplier = Math.min(1, volume / 100);
                            const targetHeight = baseHeight + (maxAdditionalHeight * heightMultiplier);
                            
                            // Calcular altura individual de cada barra para efecto de onda
                            const waveOffset = Math.sin((i / 40) * Math.PI) * 0.3;
                            const barHeight = isActive 
                              ? Math.max(baseHeight, targetHeight * (0.5 + waveOffset))
                              : baseHeight;
                            
                            // Color según intensidad (tipo Discord: verde -> amarillo -> rojo)
                            let barColor = 'bg-slate-700';
                            if (isTesting && isActive) {
                              if (volume > 80) {
                                barColor = 'bg-gradient-to-t from-red-500 to-red-400'; // Alto: rojo
                              } else if (volume > 50) {
                                barColor = 'bg-gradient-to-t from-yellow-400 to-yellow-300'; // Medio: amarillo
                              } else {
                                barColor = 'bg-gradient-to-t from-green-400 to-green-300'; // Bajo: verde
                              }
                            }
                            
                            return (
                              <div
                                key={i}
                                className={`w-1.5 rounded-full transition-all duration-75 ease-out ${barColor}`}
                                style={{
                                  height: `${isTesting ? barHeight : baseHeight}%`,
                                  opacity: isActive ? 0.9 + (volume / 200) : 0.3,
                                  transform: isSpeaking && isActive ? 'scaleY(1.05)' : 'scaleY(1)',
                                }}
                              />
                            );
                          })}
                        </div>
                        
                        {/* Indicador de volumen numérico */}
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white/60 text-sm">Nivel de entrada:</span>
                            <span className={`font-mono font-bold ${
                              volume > 50 ? 'text-green-400' : volume > 20 ? 'text-yellow-400' : 'text-slate-400'
                            }`}>
                              {Math.round(volume)}%
                            </span>
                          </div>
                          
                          {isSpeaking && isTesting && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              <span className="text-green-400 text-sm">Hablando</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Estado del micrófono */}
                      <div className="mb-6">
                        {hasPermission === false && (
                          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <div>
                              <p className="text-red-400 font-medium">{micError || 'Permiso de micrófono denegado'}</p>
                              <p className="text-red-400/70 text-sm">Haz clic en "Probar micrófono" y permite el acceso cuando el navegador lo solicite.</p>
                            </div>
                          </div>
                        )}
                        
                        {hasPermission === true && isTesting && (
                          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <p className="text-green-400">Micrófono funcionando correctamente</p>
                          </div>
                        )}
                      </div>

                      {/* Selector de dispositivo */}
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">
                          Dispositivo de entrada
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedDevice}
                            onChange={(e) => changeDevice(e.target.value)}
                            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-white/30"
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
                            className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition-colors"
                            title="Actualizar lista de dispositivos"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Preferencias Tab */}
                {activeTab === 'preferences' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Settings className="w-6 h-6" />
                      Preferencias
                    </h2>
                    
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-white/60" />
                          <div>
                            <p className="text-white font-medium">Sonidos de notificación</p>
                            <p className="text-white/50 text-sm">Alertas al cambiar de ronda</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings({ ...settings, notificationSounds: !settings.notificationSounds })}
                          className={`w-12 h-6 rounded-full transition-colors relative ${
                            settings.notificationSounds ? 'bg-green-500' : 'bg-slate-600'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            settings.notificationSounds ? 'translate-x-6' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Moon className="w-5 h-5 text-white/60" />
                          <div>
                            <p className="text-white font-medium">Tema oscuro</p>
                            <p className="text-white/50 text-sm">Interfaz siempre en modo oscuro</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-white/10 rounded-full text-white/60 text-sm">
                          Predeterminado
                        </span>
                      </div>

                      <div className="pt-4">
                        <LiquidGlassButton onClick={saveSettings} variant="primary" className="w-full sm:w-auto">
                          <Save className="w-4 h-4" />
                          <span>Guardar preferencias</span>
                        </LiquidGlassButton>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacidad Tab */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                      <Trash2 className="w-6 h-6" />
                      Privacidad y Datos
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Download className="w-6 h-6 text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">Exportar datos</h3>
                            <p className="text-white/50 text-sm mb-4">Descarga una copia de seguridad de tu configuración y debates.</p>
                            <button
                              onClick={exportData}
                              className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-colors"
                            >
                              Exportar a JSON
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-white/5 border border-red-500/20 rounded-2xl">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                            <Trash2 className="w-6 h-6 text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-white mb-1">Eliminar todos los datos</h3>
                            <p className="text-white/50 text-sm mb-4">Esta acción eliminará permanentemente tu configuración, debates e historial. No se puede deshacer.</p>
                            <button
                              onClick={clearAllData}
                              className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl hover:bg-red-500/30 transition-colors"
                            >
                              Eliminar todo
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 text-center">
                        <p className="text-white/30 text-sm">
                          CiceronAI v1.0 • Todos los datos se almacenan localmente en tu navegador
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;
