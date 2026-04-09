/**
 * Componente TeamCard - Vista minimalista del equipo.
 */

import React from 'react';
import { TeamPosition } from '../../types';
import { formatTime } from '../../hooks/useDebateTimer';

interface TeamCardProps {
  teamId: TeamPosition;
  teamName: string;
  isActive: boolean;
  timeRemaining: number;
  maxTime: number;
}

export const TeamCard: React.FC<TeamCardProps> = ({
  teamId,
  teamName,
  isActive,
  timeRemaining,
}) => {
  const isTeamA = teamId === 'A';
  const isOvertime = timeRemaining < 0;
  const accentColor = isTeamA ? '#FF6B00' : '#00E5FF';
  const sideLabel = isTeamA ? 'A favor' : 'En contra';
  const timerValue = isActive ? formatTime(timeRemaining) : '00:00';

  return (
    <section
      className="relative flex min-h-[420px] flex-1 flex-col justify-between overflow-hidden rounded-[30px] border px-6 py-6 sm:px-8 sm:py-8"
      style={{
        borderColor: isActive ? `${accentColor}78` : 'rgba(255,255,255,0.08)',
        background: `linear-gradient(180deg, ${isActive
          ? isTeamA ? 'rgba(255,107,0,0.20)' : 'rgba(0,229,255,0.20)'
          : isTeamA ? 'rgba(255,107,0,0.06)' : 'rgba(0,229,255,0.06)'} 0%, rgba(15,23,42,0.92) 38%, rgba(15,23,42,1) 100%)`,
        boxShadow: isActive
          ? `0 28px 70px rgba(2, 6, 23, 0.46), 0 0 0 1px ${accentColor}30 inset, 0 0 36px ${accentColor}22`
          : '0 18px 44px rgba(2, 6, 23, 0.28)',
      }}
    >
      <div>
        <span
          className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
          style={{
            color: accentColor,
            borderColor: `${accentColor}38`,
            background: `${accentColor}10`,
          }}
        >
          {sideLabel}
        </span>

        <h2 className="mt-5 break-words text-3xl font-semibold text-white sm:text-4xl">
          {teamName}
        </h2>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          className={`text-center text-7xl font-semibold tracking-tight sm:text-8xl lg:text-[7.5rem] ${
            isOvertime ? 'animate-pulse text-red-400' : isActive ? 'text-white' : 'text-white/22'
          }`}
        >
          {timerValue}
        </div>
      </div>

      <div className="h-2" />
    </section>
  );
};

export default TeamCard;
