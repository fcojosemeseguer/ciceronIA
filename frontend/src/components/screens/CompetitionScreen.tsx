/**
 * CompetitionScreen - Pantalla principal del debate
 * Estilo Aurora con colores naranja/cian
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { useRealtimeAnalysis } from '../../hooks/useRealtimeAnalysis';
import { TeamCard, CentralPanel } from '../common';
import { Mic, MicOff, Loader2, CheckCircle, AlertCircle, BarChart3, ArrowLeft, Play, X, FileAudio } from 'lucide-react';
import { AudioRecording, AnalysisResult, Project, Debate } from '../../types';

interface CompetitionScreenProps {
  project?: Project;  // LEGACY - mantener durante transición
  debate?: Debate;    // NUEVO - usar este preferentemente
  onFinish?: () => void;
  onBack?: () => void;
}

export const CompetitionScreen: React.FC<CompetitionScreenProps> = ({ project, debate, onFinish, onBack }) => {
  // Todos los hooks primero
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
    initializeDebateFromProject,
    initializeDebate,
  } = useDebateStore();

  // Estado para el panel de resultados
  const [showResultsPanel, setShowResultsPanel] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([]);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [isAnalyzingCurrent, setIsAnalyzingCurrent] = useState(false);

  // Usar debate si está disponible, sino project (legacy)
  const debateData = debate || project;
  
  // Extraer valores del debate/proyecto
  const debateTypeId = debate?.debate_type || project?.debate_type || 'upct';
  
  // Hook para análisis en tiempo real
  const handleAnalysisComplete = useCallback((result: AnalysisResult) => {
    addAnalysisResult(result);
    setAnalysisResults(prev => [...prev, result]);
    setIsAnalyzingCurrent(false);
    setCurrentRecording(null);
  }, [addAnalysisResult]);

  const {
    queueAnalysis,
    isProcessing,
    completedCount,
    errorCount,
  } = useRealtimeAnalysis(debateData as any, debateTypeId, handleAnalysisComplete);

  // Timer hook - no necesita parámetros
  useDebateTimer();
  
  // Auto recording hook - usa el hook simple sin parámetros
  const { isRecording } = useAutoAudioRecording();

  // Inicializar debate desde los datos al montar
  useEffect(() => {
    if (debateData) {
      if (debate) {
        // Nuevo formato: inicializar desde Debate
        const isRetor = debate.debate_type === 'retor';
        const roundDurations = isRetor
          ? {
              introduccion: 360,
              primerRefutador: 120,
              segundoRefutador: 300,
              conclusion: 180,
            }
          : {
              introduccion: 180,
              primerRefutador: 240,
              segundoRefutador: 240,
              conclusion: 180,
            };
        
        initializeDebate({
          teamAName: debate.team_a_name,
          teamBName: debate.team_b_name,
          debateTopic: debate.debate_topic,
          roundDurations,
        });
      } else if (project) {
        // Legacy: inicializar desde Project
        initializeDebateFromProject(project);
      }
    }
  }, [debateData, debate, project, initializeDebate, initializeDebateFromProject]);

  // Extraer valores del debate/proyecto
  const teamAName = debate?.team_a_name || project?.team_a_name || getTeamName('A');
  const teamBName = debate?.team_b_name || project?.team_b_name || getTeamName('B');
  const debateTopic = debate?.debate_topic || debate?.name || project?.debate_topic || project?.name || 'Tema del Debate';
  const debateTypeLabel = debateTypeId === 'retor' ? 'RETOR' : 'UPCT';
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

  const handleAnalyzeCurrent = async () => {
    if (currentRecording) {
      setIsAnalyzingCurrent(true);
      await queueAnalysis(currentRecording);
    }
  };

  const handleDiscardCurrent = () => {
    setCurrentRecording(null);
  };

  useEffect(() => {
    if (state === 'finished') {
      onFinish?.();
    }
  }, [state, onFinish]);

  // Early return después de todos los hooks
  if (!debateData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white/60">Error: No se proporcionó debate ni proyecto</div>
      </div>
    );
  }

  const currentRound = getCurrentRound();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header con info del proyecto */}
      <header className="backdrop-blur-xl bg-black/40 border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">{debateTopic}</h1>
              <p className="text-sm text-white/50">
                {teamAName} vs {teamBName} · {debateTypeLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botón de resultados */}
            <button
              onClick={() => setShowResultsPanel(!showResultsPanel)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors
                ${showResultsPanel 
                  ? 'bg-[#00E5FF]/20 border-[#00E5FF]/50 text-[#00E5FF]' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}
              `}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Resultados</span>
              {analysisResults.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-[#00E5FF]/30 rounded-full text-xs">
                  {analysisResults.length}
                </span>
              )}
            </button>

            {/* Indicadores de grabación y análisis */}
            <div className="flex items-center gap-2">
              {isRecording && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF6B00]/20 border border-[#FF6B00]/30">
                  <Mic className="w-4 h-4 text-[#FF6B00] animate-pulse" />
                  <span className="text-[#FF6B00] text-sm font-medium hidden sm:inline">Grabando</span>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30">
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                  <span className="text-blue-400 text-sm font-medium hidden sm:inline">Analizando...</span>
                </div>
              )}

              {completedCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">{completedCount}</span>
                </div>
              )}

              {errorCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">{errorCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Panel de grabación actual */}
          {currentRecording && (
            <div className="p-4 bg-[#00E5FF]/10 border-b border-[#00E5FF]/30">
              <div className="max-w-7xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileAudio className="w-5 h-5 text-[#00E5FF]" />
                  <div>
                    <p className="text-white font-medium">
                      Intervención grabada - {currentRecording.roundType}
                    </p>
                    <p className="text-white/50 text-sm">
                      {currentRecording.team === 'A' ? teamAName : teamBName} · {Math.round(currentRecording.duration)}s
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDiscardCurrent}
                    disabled={isAnalyzingCurrent}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={handleAnalyzeCurrent}
                    disabled={isAnalyzingCurrent}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/50 text-[#00E5FF] hover:bg-[#00E5FF]/30 transition-colors disabled:opacity-50"
                  >
                    {isAnalyzingCurrent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analizando...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Analizar Intervención
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Debate Area */}
          <main className="flex-1 flex flex-col md:flex-row gap-2 p-2 sm:p-3 overflow-auto">
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

          {/* Footer */}
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
                <div>Ronda {currentRoundIndex + 1} de {totalRounds}</div>
              </div>
            </div>
          </footer>
        </div>

        {/* Results Panel */}
        {showResultsPanel && (
          <div className="w-96 bg-black/60 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Resultados</h2>
                <button
                  onClick={() => setShowResultsPanel(false)}
                  className="p-1 text-white/50 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {analysisResults.length === 0 ? (
                <div className="text-center py-8 text-white/40">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay análisis aún</p>
                  <p className="text-sm mt-1">Graba y analiza intervenciones para ver los resultados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analysisResults.map((result, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-xl bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium text-sm">{result.fase}</span>
                        <span className="text-[#00E5FF] font-bold">{result.total}/{result.max_total}</span>
                      </div>
                      <p className="text-white/50 text-xs mb-2">{result.postura}</p>
                      
                      <div className="space-y-1">
                        {result.criterios.slice(0, 3).map((criterio, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <span className="text-white/60">{criterio.criterio}</span>
                            <span className="text-white/80">{criterio.nota}</span>
                          </div>
                        ))}
                        {result.criterios.length > 3 && (
                          <p className="text-xs text-white/40 mt-1">+{result.criterios.length - 3} criterios más...</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionScreen;
