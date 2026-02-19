/**
 * CompetitionScreen - Pantalla principal del debate
 * Estilo Aurora con colores naranja/cian
 */

import React, { useEffect, useCallback } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { useRealtimeAnalysis } from '../../hooks/useRealtimeAnalysis';
import { TeamCard, CentralPanel } from '../common';
import { Mic, MicOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { AudioRecording, AnalysisResult } from '../../types';

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
    isLastRound,
    canNavigateToTeamATurn,
    canNavigateToTeamBTurn,
    addAnalysisResult,
  } = useDebateStore();

  // Hook para análisis en tiempo real
  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    addAnalysisResult(result);
  }, [addAnalysisResult]);

  const {
    queueAnalysis,
    getQueueStatus,
    isProcessing,
    pendingCount,
    completedCount,
    errorCount,
  } = useRealtimeAnalysis('upct', handleAnalysisComplete);

  // Hook de grabación con callback para análisis
  const handleRecordingComplete = useCallback((recording: AudioRecording) => {
    queueAnalysis(recording);
  }, [queueAnalysis]);

  const { isRecording, audioError } = useAutoAudioRecording({
    onRecordingComplete: handleRecordingComplete,
  });
  
  useDebateTimer();

  const currentRound = getCurrentRound();
  const teamAName = getTeamName('A');
  const teamBName = getTeamName('B');
  const isTeamAActive = currentTeam === 'A';

  const totalRounds = 8;

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
    goToNextTeamBTurn();
  };

  const handlePrevious = () => {
    goToNextTeamATurn();
  };

  const handleEndDebate = () => {
    finishDebate();
    onFinish?.();
  };

  // Eliminado: Ya no se finaliza automáticamente cuando el tiempo llega a 0
  // El juez controla manualmente cuándo terminar el debate
  // useEffect(() => {
  //   if (timeRemaining === 0 && state === 'running' && currentRoundIndex === totalRounds - 1) {
  //     finishDebate();
  //     onFinish?.();
  //   }
  // }, [timeRemaining, state, currentRoundIndex, finishDebate, onFinish]);

  useEffect(() => {
    if (state === 'finished') {
      onFinish?.();
    }
  }, [state, onFinish]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
        {/* Recording and Analysis indicators */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30">
              <Mic className="w-4 h-4 text-[#FF6B00] animate-pulse" />
              <span className="text-[#FF6B00] text-sm font-medium hidden sm:block">Grabando</span>
            </div>
          )}
          {audioError && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30">
              <MicOff className="w-4 h-4 text-yellow-400" />
            </div>
          )}
          
          {/* Analysis status indicators */}
          {(isProcessing || pendingCount > 0 || completedCount > 0) && (
            <div className="flex flex-col gap-1">
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-blue-400 text-sm font-medium">Analizando...</span>
                </div>
              )}
              {pendingCount > 0 && !isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
                  <span className="text-purple-400 text-sm">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
                </div>
              )}
              {completedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">{completedCount} analizado{completedCount > 1 ? 's' : ''}</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">{errorCount} error{errorCount > 1 ? 'es' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col md:flex-row gap-2 p-2 sm:p-3 pt-4 pb-32 overflow-auto">
          {/* Team A - Naranja */}
          <TeamCard
            teamId="A"
            teamName={teamAName}
            isActive={isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
            roundType={currentRound?.roundType}
            roundOrder={currentRound?.order}
          />

          {/* Central Panel */}
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
            isRunning={isTimerRunning}
            onPlayPause={handlePlayPause}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onEndDebate={handleEndDebate}
            hasNextTeamATurn={canNavigateToTeamATurn()}
            hasNextTeamBTurn={canNavigateToTeamBTurn()}
            isLastRound={isLastRound()}
            debateState={state}
          />

          {/* Team B - Cian */}
          <TeamCard
            teamId="B"
            teamName={teamBName}
            isActive={!isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
            roundType={currentRound?.roundType}
            roundOrder={currentRound?.order}
          />
        </main>

        {/* Footer - Solo estado y ronda */}
        <footer className="backdrop-blur-xl bg-black/40 border-t border-white/10 p-3 sm:p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-white/50 gap-2">
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
        </footer>
    </div>
  );
};
