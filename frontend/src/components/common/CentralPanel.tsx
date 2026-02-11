/**
 * Componente CentralPanel - Panel central con información del estado y controles
 * Responsivo: Desktop, Tablet, Mobile
 */

import React from 'react';
import { RoundType, TeamPosition } from '../../types';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface CentralPanelProps {
  debateTopic: string;
  currentRoundType: RoundType | undefined;
  activeTeam: string;
  roundNumber: number;
  totalRounds: number;
  // Props para los botones de control
  isRunning?: boolean;
  onPlayPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onEndDebate?: () => void;
  hasNextTeamATurn?: boolean;
  hasNextTeamBTurn?: boolean;
  isLastRound?: boolean;
  debateState?: 'setup' | 'paused' | 'running' | 'finished';
}

export const CentralPanel: React.FC<CentralPanelProps> = ({
  debateTopic,
  currentRoundType,
  activeTeam,
  roundNumber,
  totalRounds,
  isRunning,
  onPlayPause,
  onPrevious,
  onNext,
  onEndDebate,
  hasNextTeamATurn,
  hasNextTeamBTurn,
  isLastRound,
  debateState,
}) => {
  const isFinished = debateState === 'finished';
  const showControls = onPlayPause && onPrevious && onNext;

  return (
    <div
      className={`
        flex flex-col justify-center items-center gap-2 sm:gap-3 md:gap-4 p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-2xl
        border-2 sm:border-4 border-black
        min-h-20 sm:min-h-24 md:min-h-28 flex-1 max-w-xs mx-auto
        shadow-lg
      `}
      style={{
        background: 'linear-gradient(135deg, #2d3748 0%, #1a1f3a 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Tema del debate */}
      <div className="text-center">
        <p className="text-sm sm:text-base md:text-lg text-gray-400 uppercase tracking-widest mb-3 font-semibold">TEMA</p>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white leading-tight px-2 line-clamp-3">
          {debateTopic}
        </h3>
      </div>

      {/* Separador */}
      <div className="w-12 sm:w-16 h-1 bg-gradient-to-r from-[#FF6B00] via-transparent to-[#00E5FF] rounded-full" />

      {/* Tipo de ronda actual */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-semibold">Ronda</p>
        <div className="inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-lg font-bold text-sm sm:text-base text-white bg-white/10 border border-white/20">
          {currentRoundType || 'Preparación'}
        </div>
      </div>

      {/* Botones de control */}
      {showControls && (
        <div className="flex flex-col items-center gap-3 w-full mt-4">
          {/* Turno A */}
          {!isLastRound && (
            <button
              onClick={onPrevious}
              disabled={!hasNextTeamATurn || isFinished}
              className={`
                w-full max-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold
                transition-smooth border-2 text-sm
                ${
                  hasNextTeamATurn && !isFinished
                    ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/30 hover:shadow-lg active:scale-95'
                    : 'bg-[#FF6B00]/10 border-[#FF6B00]/30 text-[#FF6B00]/50 cursor-not-allowed'
                }
              `}
            >
              <ChevronLeft size={18} />
              <span>Turno A</span>
            </button>
          )}

          {/* Play/Pause */}
          <button
            onClick={onPlayPause}
            disabled={isFinished}
            className={`
              flex items-center justify-center w-14 h-14 rounded-full
              transition-smooth border-4 font-semibold active:scale-95
              ${
                isFinished
                  ? 'bg-gray-700/40 border-gray-600/40 text-gray-500 cursor-not-allowed'
                  : 'bg-black border-gray-600 text-white hover:border-gray-400 hover:shadow-glow-blue'
              }
            `}
          >
            {isRunning ? (
              <Pause size={24} />
            ) : (
              <Play size={24} />
            )}
          </button>

          {/* Turno B / Finalizar */}
          {!isLastRound ? (
            <button
              onClick={onNext}
              disabled={!hasNextTeamBTurn || isFinished || debateState === 'setup'}
              className={`
                w-full max-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold
                transition-smooth border-2 text-sm
                ${
                  hasNextTeamBTurn && !isFinished && debateState !== 'setup'
                    ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/30 hover:shadow-lg active:scale-95'
                    : 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]/50 cursor-not-allowed'
                }
              `}
            >
              <span>Turno B</span>
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={onEndDebate}
              disabled={isFinished}
              className={`
                w-full max-w-[200px] flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold
                transition-smooth border-2 text-sm
                ${
                  !isFinished
                    ? 'bg-green-900/50 border-green-600 text-green-200 hover:bg-green-800/60 hover:shadow-lg active:scale-95'
                    : 'bg-green-900/20 border-green-600/30 text-green-400/50 cursor-not-allowed'
                }
              `}
            >
              <span>Finalizar</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
