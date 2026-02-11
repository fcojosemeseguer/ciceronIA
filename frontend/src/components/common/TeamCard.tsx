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
        flex flex-col gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-2xl
        border-2 sm:border-4 border-black
        ${isActive ? 'transition-smooth' : 'opacity-40 md:opacity-50 transition-smooth'}
        ${isActive && isTeamA ? 'glow-pulse-orange' : ''}
        ${isActive && !isTeamA ? 'glow-pulse-cyan' : ''}
        min-h-20 sm:min-h-24 md:min-h-28 flex-1
      `}
      style={{
        background: isTeamA
          ? 'linear-gradient(135deg, #3d1a00 0%, #111827 100%)'
          : 'linear-gradient(135deg, #002a3d 0%, #111827 100%)',
      }}
    >
      {/* Header con degradado */}
      <div
        className={`
          px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-center
          ${isTeamA ? 'bg-gradient-to-r from-[#FF6B00] to-[#CC5500]' : 'bg-gradient-to-r from-[#00E5FF] to-[#00B8CC]'}
        `}
      >
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white break-words">
          {teamName}
        </h2>
      </div>

       {/* Temporizador digital */}
       <div
         className={`
           text-center transition-smooth flex-1 flex items-center justify-center
           text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-wider
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
              isTeamA ? 'bg-[#FF6B00]' : 'bg-[#00E5FF]'
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
            ${isTeamA ? 'bg-[#FF6B00]/20 text-[#FF6B00]' : 'bg-[#00E5FF]/20 text-[#00E5FF]'}
          `}
        >
          EN TURNO
        </div>
      )}
    </div>
  );
};
