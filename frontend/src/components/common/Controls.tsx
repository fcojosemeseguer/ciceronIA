/**
 * Componente Controls - Controles inferiores (Play/Pause, Previous/Next)
 * Responsivo: Desktop, Tablet, Mobile
 */

import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { TeamPosition } from '../../types';

interface ControlsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onEndDebate?: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  hasNextTeamATurn: boolean;
  hasNextTeamBTurn: boolean;
  isLastRound: boolean;
  nextTeam: TeamPosition | null;
  debateState: 'setup' | 'paused' | 'running' | 'finished';
  currentTeam: TeamPosition;
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onPlayPause,
  onPrevious,
  onNext,
  onEndDebate,
  canGoNext,
  canGoPrevious,
  hasNextTeamATurn,
  hasNextTeamBTurn,
  isLastRound,
  nextTeam,
  debateState,
  currentTeam,
}) => {
  const isFinished = debateState === 'finished';

  return (
    <div className="flex flex-col sm:flex-row justify-center items-center gap-1 sm:gap-2 md:gap-4 flex-wrap -mt-8">
      {/* Only show Turno A if there's a next Team A turn */}
      {!isLastRound && (
        <button
          onClick={onPrevious}
          disabled={!hasNextTeamATurn || isFinished}
          className={`
            flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold
            transition-smooth border-2 text-xs sm:text-sm
            ${
              hasNextTeamATurn && !isFinished
                ? 'bg-[#FF6B00]/20 border-[#FF6B00] text-[#FF6B00] hover:bg-[#FF6B00]/30 hover:shadow-lg active:scale-95'
                : 'bg-[#FF6B00]/10 border-[#FF6B00]/30 text-[#FF6B00]/50 cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft size={16} className="sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Turno A</span>
          <span className="sm:hidden">A</span>
        </button>
      )}

      {/* Play/Pause Central Button */}
      <button
        onClick={onPlayPause}
        disabled={isFinished}
        className={`
          flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full
          transition-smooth border-4 font-semibold active:scale-95
          ${
            isFinished
              ? 'bg-gray-700/40 border-gray-600/40 text-gray-500 cursor-not-allowed'
              : 'bg-black border-gray-600 text-white hover:border-gray-400 hover:shadow-glow-blue'
          }
        `}
      >
        {isRunning ? (
          <Pause size={24} className="sm:w-7 sm:h-7" />
        ) : (
          <Play size={24} className="sm:w-7 sm:h-7" />
        )}
      </button>

      {/* Show Turno B if not last round, otherwise show End Debate button */}
      {!isLastRound ? (
        <button
          onClick={onNext}
          disabled={!hasNextTeamBTurn || isFinished || debateState === 'setup'}
          className={`
            flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold
            transition-smooth border-2 text-xs sm:text-sm
            ${
              hasNextTeamBTurn && !isFinished && debateState !== 'setup'
                ? 'bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/30 hover:shadow-lg active:scale-95'
                : 'bg-[#00E5FF]/10 border-[#00E5FF]/30 text-[#00E5FF]/50 cursor-not-allowed'
            }
          `}
        >
          <span className="hidden sm:inline">Turno B</span>
          <span className="sm:hidden">B</span>
          <ChevronRight size={16} className="sm:w-5 sm:h-5" />
        </button>
      ) : (
        <button
          onClick={onEndDebate}
          disabled={isFinished}
          className={`
            flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold
            transition-smooth border-2 text-xs sm:text-sm
            ${
              !isFinished
                ? 'bg-green-900/50 border-green-600 text-green-200 hover:bg-green-800/60 hover:shadow-lg active:scale-95'
                : 'bg-green-900/20 border-green-600/30 text-green-400/50 cursor-not-allowed'
            }
          `}
        >
          <span className="hidden sm:inline">Finalizar Debate</span>
          <span className="sm:hidden">Fin</span>
        </button>
      )}
    </div>
  );
};
