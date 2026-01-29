/**
 * CompetitionScreen - Pantalla principal del debate
 * Muestra los dos equipos, panel central y controles
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
    nextRound,
    previousRound,
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
    if (state === 'paused') {
      resumeDebate();
    } else if (state === 'running') {
      pauseDebate();
    } else if (state === 'setup') {
      startDebate();
    }
  };

  const handleNext = () => {
    nextRound();
  };

  const handlePrevious = () => {
    previousRound();
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

  return (
    <div className="cinema-background">
      <div className="relative z-10 h-screen flex flex-col">
        {/* Encabezado con tema */}
        <div className="flex-shrink-0 border-b-2 border-gray-700/50 p-4 text-center">
          <h1 className="text-2xl font-bold text-white opacity-90">{config.debateTopic}</h1>
          {state === 'finished' && (
            <p className="text-red-400 font-bold mt-1 text-lg">DEBATE FINALIZADO</p>
          )}
        </div>

        {/* Contenedor principal - Layout 3 columnas */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
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

        {/* Panel de controles - Inferior */}
        <div className="flex-shrink-0 border-t-2 border-gray-700/50 p-6 bg-dark-card/50">
          {/* Indicador de grabación */}
          <div className="flex justify-center items-center gap-2 mb-4">
            {isRecording && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900/40 border border-red-600">
                <div className="flex items-center gap-2">
                  <Mic size={16} className="text-red-400 animate-pulse" />
                  <span className="text-red-300 text-sm font-semibold">Grabando...</span>
                </div>
              </div>
            )}
            {audioError && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-900/40 border border-yellow-600">
                <MicOff size={16} className="text-yellow-400" />
                <span className="text-yellow-300 text-xs">Error de micrófono: {audioError}</span>
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

          {/* Estado general */}
          <div className="flex justify-between items-center mt-6 text-xs text-gray-400">
            <div>
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
