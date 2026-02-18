/**
 * Hook para test de micrófono con visualizador de ondas
 * Similar al test de Discord
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface MicrophoneTestState {
  isTesting: boolean;
  hasPermission: boolean | null;
  volume: number;
  isSpeaking: boolean;
  error: string | null;
  selectedDevice: string;
  devices: MediaDeviceInfo[];
}

export const useMicrophoneTest = () => {
  const [state, setState] = useState<MicrophoneTestState>({
    isTesting: false,
    hasPermission: null,
    volume: 0,
    isSpeaking: false,
    error: null,
    selectedDevice: '',
    devices: [],
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  // Cargar dispositivos de audio
  const loadDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      setState(prev => ({ ...prev, devices: audioDevices }));
      
      // Seleccionar el primero por defecto si no hay ninguno seleccionado
      if (audioDevices.length > 0 && !state.selectedDevice) {
        setState(prev => ({ ...prev, selectedDevice: audioDevices[0].deviceId }));
      }
    } catch (err) {
      console.error('Error loading devices:', err);
    }
  }, [state.selectedDevice]);

  // Iniciar test de micrófono
  const startTest = useCallback(async (deviceId?: string) => {
    try {
      // Detener test anterior si existe
      if (state.isTesting) {
        stopTest();
      }

      const constraints: MediaStreamConstraints = {
        audio: deviceId 
          ? { deviceId: { exact: deviceId } }
          : true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      mediaStreamRef.current = stream;

      // Crear AudioContext
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Crear analyser
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Conectar stream al analyser
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      // Crear array para datos
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      dataArrayRef.current = dataArray;

      setState(prev => ({
        ...prev,
        isTesting: true,
        hasPermission: true,
        error: null,
        selectedDevice: deviceId || prev.selectedDevice,
      }));

      // Iniciar loop de análisis
      const analyzeAudio = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArrayRef.current);

        // Calcular volumen promedio
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          sum += dataArrayRef.current[i];
        }
        const average = sum / dataArrayRef.current.length;
        const normalizedVolume = Math.min(100, (average / 128) * 100);

        // Detectar si está hablando (umbral de 20%)
        const isSpeaking = normalizedVolume > 20;

        setState(prev => ({
          ...prev,
          volume: normalizedVolume,
          isSpeaking,
        }));

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      analyzeAudio();

    } catch (err: any) {
      console.error('Error starting microphone test:', err);
      setState(prev => ({
        ...prev,
        isTesting: false,
        hasPermission: false,
        error: err.name === 'NotAllowedError' 
          ? 'Permiso de micrófono denegado'
          : 'Error al acceder al micrófono',
      }));
    }
  }, [state.isTesting]);

  // Detener test
  const stopTest = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    dataArrayRef.current = null;

    setState(prev => ({
      ...prev,
      isTesting: false,
      volume: 0,
      isSpeaking: false,
    }));
  }, []);

  // Cambiar dispositivo
  const changeDevice = useCallback((deviceId: string) => {
    setState(prev => ({ ...prev, selectedDevice: deviceId }));
    if (state.isTesting) {
      startTest(deviceId);
    }
  }, [state.isTesting, startTest]);

  // Cargar dispositivos al inicio
  useEffect(() => {
    loadDevices();
    
    // Escuchar cambios de dispositivos
    navigator.mediaDevices.addEventListener('devicechange', loadDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', loadDevices);
      stopTest();
    };
  }, [loadDevices, stopTest]);

  return {
    ...state,
    startTest,
    stopTest,
    changeDevice,
    refreshDevices: loadDevices,
  };
};

export default useMicrophoneTest;
