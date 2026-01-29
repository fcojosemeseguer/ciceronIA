/**
 * Componente TeamCard - Panel de equipo con temporizador
 * Responsivo: Desktop, Tablet, Mobile
 */

import React from 'react';
import { TeamPosition, RoundType } from '../../types';
import { formatTime } from '../../hooks/useDebateTimer';

interface TeamCardProps {
  teamId: TeamPosition;
  teamName: string;
  isActive: boolean;
  timeRemaining: number;
  maxTime: number;
  roundType?: RoundType;
  roundOrder?: number;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  teamName,
  isActive,
  timeRemaining,
  maxTime,
  roundType,
  roundOrder,
}) => {
  const isTeamA = teamId === 'A';
  const progress = (timeRemaining / maxTime) * 100;

  return (
    <div
      className={`
        flex flex-col gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-2xl
        border-2 sm:border-4 border-black
        ${isActive ? 'transition-smooth' : 'opacity-40 md:opacity-50 transition-smooth'}
        ${isActive && isTeamA ? 'glow-pulse-red' : ''}
        ${isActive && !isTeamA ? 'glow-pulse-blue' : ''}
        min-h-64 sm:min-h-72 md:min-h-80 flex-1
      `}
      style={{
        background: isTeamA
          ? 'linear-gradient(135deg, #3f0000 0%, #1a1f3a 100%)'
          : 'linear-gradient(135deg, #001a4d 0%, #1a1f3a 100%)',
      }}
    >
      {/* Header con degradado */}
      <div
        className={`
          px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-center
          ${isTeamA ? 'bg-gradient-to-r from-red-600 to-red-700' : 'bg-gradient-to-r from-blue-700 to-blue-800'}
        `}
      >
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white break-words">
          {teamName}
        </h2>
        {roundType && (
          <p className="text-xs text-gray-200 mt-1">
            {roundType} • Turno {roundOrder}
          </p>
        )}
      </div>

      {/* Etiqueta de tiempo */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Tiempo</p>
      </div>

       {/* Temporizador digital */}
       <div
         className={`
           text-center digital-timer transition-smooth
           text-3xl sm:text-5xl md:text-6xl
           ${isActive ? (isTeamA ? 'text-white' : 'text-white') : 'text-gray-500'}
         `}
       >
         {isActive ? formatTime(timeRemaining) : '00:00'}
       </div>

      {/* Barra de progreso */}
      <div className="mt-auto">
        <div className="progress-bar-bg">
          <div
            className={`progress-bar-fill transition-smooth ${
              isTeamA ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Indicador de estado */}
      {isActive && (
        <div
          className={`
            text-center text-xs font-semibold py-2 rounded-lg
            ${isTeamA ? 'bg-red-900/40 text-red-200' : 'bg-blue-900/40 text-blue-200'}
          `}
        >
          EN TURNO
        </div>
      )}
    </div>
  );
};
