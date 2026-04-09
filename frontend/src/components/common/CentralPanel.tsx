/**
 * Componente CentralPanel - Panel central minimalista del debate en vivo.
 */

import React from 'react';
import { RoundType } from '../../types';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface CentralPanelProps {
  debateTopic: string;
  currentRoundType: RoundType | undefined;
  activeTeam: string;
  roundNumber: number;
  totalRounds: number;
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
    <section
      className="live-panel live-animate-delayed mx-auto flex min-h-[420px] w-full max-w-[360px] flex-col justify-between rounded-[30px] px-6 py-6 sm:px-8 sm:py-8"
    >
      <div className="text-center">
        <h2 className="text-2xl font-semibold leading-tight sm:text-[1.9rem]" style={{ color: 'var(--app-text)' }}>{debateTopic}</h2>
        <div className="mt-5 flex items-center justify-center gap-3 text-sm">
          <span className="live-chip rounded-full px-3 py-1">
            {currentRoundType || 'Preparacion'}
          </span>
          <span style={{ color: 'var(--app-text-muted)' }}>•</span>
          <span className="live-chip rounded-full px-3 py-1">
            Ronda {roundNumber}/{totalRounds}
          </span>
        </div>
      </div>

      {showControls && (
        <div className="space-y-3">
          {!isLastRound && (
            <button
              onClick={onPrevious}
              disabled={!hasNextTeamATurn || isFinished}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                hasNextTeamATurn && !isFinished
                  ? 'border-[#FF6B00]/30 bg-[#FF6B00]/10 text-[#FF6B00] hover:bg-[#FF6B00]/14'
                  : 'cursor-not-allowed border-[#FF6B00]/10 bg-[#FF6B00]/4 text-[#FF6B00]/35'
              }`}
            >
              <ChevronLeft size={18} />
              A favor
            </button>
          )}

          <button
            onClick={onPlayPause}
            disabled={isFinished}
            className={`flex h-16 w-full items-center justify-center rounded-2xl border text-white transition-colors ${
              isFinished
                ? 'cursor-not-allowed'
                : ''
            }`}
            style={{
              borderColor: isFinished ? 'var(--app-border)' : 'color-mix(in srgb, var(--app-text) 20%, transparent)',
              background: isFinished ? 'var(--app-surface)' : 'color-mix(in srgb, var(--app-surface-strong) 84%, transparent)',
              color: isFinished ? 'color-mix(in srgb, var(--app-text) 40%, transparent)' : 'var(--app-text)',
            }}
          >
            {isRunning ? <Pause size={26} /> : <Play size={26} />}
          </button>

          {!isLastRound ? (
            <button
              onClick={onNext}
              disabled={!hasNextTeamBTurn || isFinished || debateState === 'setup'}
              className={`flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                hasNextTeamBTurn && !isFinished && debateState !== 'setup'
                  ? 'border-[#00E5FF]/30 bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/14'
                  : 'cursor-not-allowed border-[#00E5FF]/10 bg-[#00E5FF]/4 text-[#00E5FF]/35'
              }`}
            >
              En contra
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={onEndDebate}
              disabled={isFinished}
              className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
                isFinished
                  ? 'cursor-not-allowed border-emerald-400/10 bg-emerald-400/5 text-emerald-200/35'
                  : 'border-emerald-400/26 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/14'
              }`}
            >
              Finalizar debate
            </button>
          )}
        </div>
      )}
    </section>
  );
};

export default CentralPanel;
