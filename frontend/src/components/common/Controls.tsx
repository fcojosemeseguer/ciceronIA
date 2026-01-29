/**
 * Componente Controls - Controles inferiores (Play/Pause, Previous/Next)
 */

import React from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { TeamPosition } from '../../types';

interface ControlsProps {
  isRunning: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  nextTeam: TeamPosition | null;
  debateState: 'setup' | 'paused' | 'running' | 'finished';
}

export const Controls: React.FC<ControlsProps> = ({
  isRunning,
  onPlayPause,
  onPrevious,
  onNext,
  canGoNext,
  canGoPrevious,
  nextTeam,
  debateState,
}) => {
  const isSetup = debateState === 'setup';
  const isFinished = debateState === 'finished';

  return (
    <div className="flex justify-center items-center gap-8">
      {/* Botón Turno Anterior */}
      <button
        onClick={onPrevious}
        disabled={!canGoPrevious || isSetup || isFinished}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
          transition-smooth border-2
          ${
            canGoPrevious && !isSetup && !isFinished
              ? 'bg-red-900/50 border-red-600 text-red-200 hover:bg-red-800/60 hover:shadow-lg'
              : 'bg-red-900/20 border-red-600/30 text-red-400/50 cursor-not-allowed'
          }
        `}
      >
        <ChevronLeft size={20} />
        <span>Turno A</span>
      </button>

      {/* Botón Play/Pause Central */}
      <button
        onClick={onPlayPause}
        disabled={isSetup || isFinished}
        className={`
          flex items-center justify-center w-16 h-16 rounded-full
          transition-smooth border-4 font-semibold
          ${
            isSetup || isFinished
              ? 'bg-gray-700/40 border-gray-600/40 text-gray-500 cursor-not-allowed'
              : 'bg-black border-gray-600 text-white hover:border-gray-400 hover:shadow-glow-blue'
          }
        `}
      >
        {isRunning ? <Pause size={28} /> : <Play size={28} />}
      </button>

      {/* Botón Turno Siguiente */}
      <button
        onClick={onNext}
        disabled={!canGoNext || isSetup || isFinished}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-lg font-semibold
          transition-smooth border-2
          ${
            canGoNext && !isSetup && !isFinished
              ? 'bg-blue-900/50 border-blue-600 text-blue-200 hover:bg-blue-800/60 hover:shadow-lg'
              : 'bg-blue-900/20 border-blue-600/30 text-blue-400/50 cursor-not-allowed'
          }
        `}
      >
        <span>Turno B</span>
        <ChevronRight size={20} />
      </button>
    </div>
  );
};
