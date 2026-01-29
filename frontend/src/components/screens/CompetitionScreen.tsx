/**
 * CompetitionScreen - Pantalla principal del debate
 * Responsiva: Desktop, Tablet, Mobile
 */

import React, { useEffect } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { TeamCard, CentralPanel, Controls } from '../common';
import { Mic, MicOff } from 'lucide-react';

interface CompetitionScreenProps {
  onFinish?: () => void;
}

export const CompetitionScreen: React.FC<CompetitionScreenProps> = ({ onFinish }) => {
  const {
    config,
    state,
    currentRoundIndex,
    currentTeam,
    timeRemaining,
    isTimerRunning,
    startDebate,
    pauseDebate,
    resumeDebate,
    goToNextTeamATurn,
    goToNextTeamBTurn,
    finishDebate,
    getCurrentRound,
    getTeamName,
    canGoToNextRound,
    canGoToPreviousRound,
  } = useDebateStore();

  const { isRecording, audioError } = useAutoAudioRecording();
  useDebateTimer();

  const currentRound = getCurrentRound();
  const teamAName = getTeamName('A');
  const teamBName = getTeamName('B');
  const isTeamAActive = currentTeam === 'A';

  const totalRounds = 8;

  // Manejo de flujo
  const handlePlayPause = () => {
    console.log('Play/Pause - Estado actual:', state);
    if (state === 'paused') {
      resumeDebate();
    } else if (state === 'running') {
      pauseDebate();
    } else if (state === 'setup') {
      startDebate();
    }
  };

  const handleNext = () => {
    console.log('Turno B - Go to next Team B turn');
    goToNextTeamBTurn();
  };

  const handlePrevious = () => {
    console.log('Turno A - Go to next Team A turn');
    goToNextTeamATurn();
  };

  // Finalizar automáticamente en el último turno cuando el tiempo llega a 0
  useEffect(() => {
    if (timeRemaining === 0 && state === 'running' && currentRoundIndex === totalRounds - 1) {
      finishDebate();
      onFinish?.();
    }
  }, [timeRemaining, state, currentRoundIndex, finishDebate, onFinish]);

  // Finalizar manualmente
  useEffect(() => {
    if (state === 'finished') {
      onFinish?.();
    }
  }, [state, onFinish]);

  // Don't auto-start - user must click Play button
  // Timer starts paused in 'setup' state until user clicks Play

  return (
    <div className="cinema-background w-full h-screen overflow-hidden flex flex-col">
      <div className="relative z-10 w-full h-full flex flex-col">
        {/* Encabezado con tema - Responsive */}
        <div className="flex-shrink-0 border-b-2 border-gray-700/50 p-2 sm:p-3 md:p-4 text-center">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white opacity-90 line-clamp-2 sm:line-clamp-1">
            {config.debateTopic}
          </h1>
          {state === 'finished' && (
            <p className="text-red-400 font-bold mt-1 text-sm md:text-lg">DEBATE FINALIZADO</p>
          )}
        </div>

        {/* Contenedor principal - Responsivo */}
        {/* Mobile: Stack vertical, Tablet/Desktop: 3 columnas */}
        <div className="flex-1 flex flex-col md:flex-row gap-2 sm:gap-4 md:gap-6 p-2 sm:p-3 md:p-6 overflow-auto md:overflow-hidden">
          {/* Equipo A - Izquierda */}
          <TeamCard
            teamId="A"
            teamName={teamAName}
            isActive={isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
            roundType={currentRound?.roundType}
            roundOrder={currentRound?.order}
          />

          {/* Panel Central */}
          <CentralPanel
            debateTopic={config.debateTopic}
            currentRoundType={currentRound?.roundType}
            activeTeam={
              state === 'setup'
                ? 'Preparación'
                : isTeamAActive
                  ? teamAName
                  : teamBName
            }
            roundNumber={currentRoundIndex + 1}
            totalRounds={totalRounds}
          />

          {/* Equipo B - Derecha */}
          <TeamCard
            teamId="B"
            teamName={teamBName}
            isActive={!isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
            roundType={currentRound?.roundType}
            roundOrder={currentRound?.order}
          />
        </div>

        {/* Panel de controles - Inferior - Responsivo */}
        <div className="flex-shrink-0 border-t-2 border-gray-700/50 p-2 sm:p-3 md:p-6 bg-dark-card/50 overflow-auto">
          {/* Indicador de grabación */}
          <div className="flex justify-center items-center gap-1 sm:gap-2 mb-2 sm:mb-4 flex-wrap">
            {isRecording && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg bg-red-900/40 border border-red-600">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Mic size={14} className="sm:w-4 sm:h-4 text-red-400 animate-pulse" />
                  <span className="text-red-300 text-xs sm:text-sm font-semibold">Grabando...</span>
                </div>
              </div>
            )}
            {audioError && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 rounded-lg bg-yellow-900/40 border border-yellow-600">
                <MicOff size={14} className="sm:w-4 sm:h-4 text-yellow-400" />
                <span className="text-yellow-300 text-xs">Error: {audioError}</span>
              </div>
            )}
          </div>

          {/* Controles de navegación */}
          <Controls
            isRunning={isTimerRunning}
            onPlayPause={handlePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            canGoNext={canGoToNextRound()}
            canGoPrevious={canGoToPreviousRound()}
            nextTeam={currentTeam === 'A' ? 'B' : 'A'}
            debateState={state}
          />

          {/* Estado general - Responsive */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-2 sm:mt-4 md:mt-6 text-xs md:text-sm text-gray-400 gap-1 sm:gap-2">
            <div className="text-center sm:text-left">
              Estado:{' '}
              <span className="text-white font-semibold">
                {state === 'setup'
                  ? 'CONFIGURACIÓN'
                  : state === 'running'
                    ? '► EN DIRECTO'
                    : state === 'paused'
                      ? '⏸ PAUSADO'
                      : '✓ FINALIZADO'}
              </span>
            </div>
            <div>Ronda {currentRoundIndex + 1} de 8</div>
          </div>
        </div>
      </div>
    </div>
  );
};
