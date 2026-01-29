/**
 * Componente CentralPanel - Panel central con información del estado
 * Responsivo: Desktop, Tablet, Mobile
 */

import React from 'react';
import { RoundType } from '../../types';

interface CentralPanelProps {
  debateTopic: string;
  currentRoundType: RoundType | undefined;
  activeTeam: string;
  roundNumber: number;
  totalRounds: number;
}

export const CentralPanel: React.FC<CentralPanelProps> = ({
  debateTopic,
  currentRoundType,
  activeTeam,
  roundNumber,
  totalRounds,
}) => {
  return (
    <div
      className={`
        flex flex-col justify-center items-center gap-3 sm:gap-4 md:gap-6 p-3 sm:p-4 md:p-6 rounded-lg sm:rounded-2xl
        border-2 sm:border-4 border-black
        min-h-64 sm:min-h-72 md:min-h-80 flex-1 max-w-xs mx-auto
        shadow-lg
      `}
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a1f3a 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Tema del debate */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Tema</p>
        <h3 className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight px-2 line-clamp-3">
          {debateTopic}
        </h3>
      </div>

      {/* Separador */}
      <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-red-500 via-transparent to-blue-500 rounded-full" />

      {/* Información de ronda */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Ronda</p>
        <p className="text-xs sm:text-sm text-gray-300 mb-1">
          {currentRoundType || 'Preparación'}
        </p>
        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
          {roundNumber}/{totalRounds}
        </p>
      </div>

      {/* Equipo activo */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Activo</p>
        <div
          className={`
            inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-sm sm:text-base text-white
            ${activeTeam.includes('A') ? 'bg-red-600/40 border border-red-500' : 'bg-blue-600/40 border border-blue-500'}
          `}
        >
          {activeTeam}
        </div>
      </div>
    </div>
  );
};
