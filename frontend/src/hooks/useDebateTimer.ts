/**
 * Hook personalizado para gestionar el temporizador del debate
 */

import { useEffect } from 'react';
import { useDebateStore } from '../store/debateStore';

export const useDebateTimer = () => {
  const { isTimerRunning, timeRemaining, decrementTime, setTimeRemaining } =
    useDebateStore();

  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      decrementTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, decrementTime]);

  return {
    timeRemaining,
    setTimeRemaining,
    isRunning: isTimerRunning,
  };
};

/**
 * Formatea segundos a formato MM:SS
 * Soporta tiempo negativo para "Tiempo Extra"
 * Ejemplos: "03:45", "-01:30", "00:00"
 */
export const formatTime = (seconds: number): string => {
  const isNegative = seconds < 0;
  const absSeconds = Math.abs(seconds);
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return isNegative ? `-${formattedTime}` : formattedTime;
};
