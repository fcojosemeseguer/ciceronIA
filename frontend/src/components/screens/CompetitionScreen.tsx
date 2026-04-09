/**
 * CompetitionScreen - Pantalla minimalista del debate en vivo.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { useRealtimeAnalysis } from '../../hooks/useRealtimeAnalysis';
import { TeamCard, CentralPanel } from '../common';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  Sparkles,
  X,
} from 'lucide-react';
import { AudioRecording, AnalysisResult, Debate, Project } from '../../types';

interface CompetitionScreenProps {
  project?: Project;
  debate?: Debate;
  onFinish?: () => void;
  onBack?: () => void;
}

const formatCompactScore = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : '0.0');
const normalizePosture = (postura: string) => (postura.toLowerCase().includes('favor') ? 'A Favor' : 'En Contra');
const formatDuration = (seconds: number) => `${Math.round((seconds || 0) / 60)} min`;

export const CompetitionScreen: React.FC<CompetitionScreenProps> = ({ project, debate, onFinish, onBack }) => {
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
    isLastRound,
    canNavigateToTeamATurn,
    canNavigateToTeamBTurn,
    addAnalysisResult,
    updateAnalysisQueueStatus,
    initializeDebateFromProject,
    initializeDebate,
    recordings,
    analysisResults,
  } = useDebateStore();

  const [showDashboard, setShowDashboard] = useState(false);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [isAnalyzingCurrent, setIsAnalyzingCurrent] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [expandedAnalysisIndex, setExpandedAnalysisIndex] = useState<number | null>(0);

  const debateData = debate || project;
  const debateTypeId = debate?.debate_type || project?.debate_type || 'upct';

  const handleAnalysisComplete = useCallback((result: AnalysisResult, recording: AudioRecording) => {
    addAnalysisResult(result);
    updateAnalysisQueueStatus(recording.id, 'completed');
    setCurrentRecording(recording);
    setIsAnalyzingCurrent(false);
    setRecordingError(null);
  }, [addAnalysisResult, updateAnalysisQueueStatus]);

  const { queueAnalysis, isProcessing } = useRealtimeAnalysis(debateData as any, debateTypeId, handleAnalysisComplete);

  useDebateTimer();

  const handleRecordingReady = useCallback(async (recording: AudioRecording) => {
    setCurrentRecording(recording);
    setRecordingError(null);
    setIsAnalyzingCurrent(true);
    updateAnalysisQueueStatus(recording.id, 'analyzing');

    try {
      await queueAnalysis(recording);
    } catch (error) {
      updateAnalysisQueueStatus(recording.id, 'error');
      setIsAnalyzingCurrent(false);
      setRecordingError(error instanceof Error ? error.message : 'No se pudo analizar la intervención');
    }
  }, [queueAnalysis, updateAnalysisQueueStatus]);

  const { isRecording, audioError } = useAutoAudioRecording({
    onRecordingComplete: handleRecordingReady,
  });

  useEffect(() => {
    if (debateData) {
      if (debate) {
        const isRetor = debate.debate_type === 'retor';
        initializeDebate({
          teamAName: debate.team_a_name,
          teamBName: debate.team_b_name,
          debateTopic: debate.debate_topic,
          roundDurations: isRetor
            ? { introduccion: 360, primerRefutador: 120, segundoRefutador: 300, conclusion: 180 }
            : { introduccion: 180, primerRefutador: 240, segundoRefutador: 240, conclusion: 180 },
        }, debate.code);
      } else if (project) {
        initializeDebateFromProject(project, project.code);
      }
    }
  }, [debateData, debate, project, initializeDebate, initializeDebateFromProject]);

  useEffect(() => {
    if (state === 'finished') {
      onFinish?.();
    }
  }, [state, onFinish]);

  useEffect(() => {
    if (audioError) {
      setRecordingError(audioError);
    }
  }, [audioError]);

  if (!debateData) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="text-white/60">Error: No se proporcionó debate ni proyecto</div>
      </div>
    );
  }

  const teamAName = debate?.team_a_name || project?.team_a_name || getTeamName('A');
  const teamBName = debate?.team_b_name || project?.team_b_name || getTeamName('B');
  const debateTopic = debate?.debate_topic || debate?.name || project?.debate_topic || project?.name || 'Tema del debate';
  const isTeamAActive = currentTeam === 'A';
  const totalRounds = 8;
  const currentRound = getCurrentRound();

  const sideStats = useMemo(() => {
    const buildStats = (posture: 'A Favor' | 'En Contra', teamName: string, accent: string) => {
      const results = analysisResults.filter((result) => normalizePosture(result.postura) === posture);
      const totalPoints = results.reduce((sum, result) => sum + result.total, 0);
      const totalMax = results.reduce((sum, result) => sum + result.max_total, 0);
      const averagePercent = results.length
        ? results.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / results.length
        : 0;
      const strongestPhase = results.reduce<{ fase: string; score: number } | null>((best, result) => {
        const score = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
        return !best || score > best.score ? { fase: result.fase, score } : best;
      }, null);

      return {
        posture: posture === 'A Favor' ? 'A favor' : 'En contra',
        teamName,
        accent,
        totalPoints,
        totalMax,
        averagePercent,
        strongestPhase: strongestPhase?.fase || 'Sin datos',
        interventions: results.length,
      };
    };

    return [
      buildStats('A Favor', teamAName, '#FF6B00'),
      buildStats('En Contra', teamBName, '#00E5FF'),
    ];
  }, [analysisResults, teamAName, teamBName]);

  const generalStats = [
    { label: 'Intervenciones analizadas', value: analysisResults.length },
    { label: 'Audio acumulado', value: formatDuration(recordings.reduce((sum, item) => sum + item.duration, 0)) },
    { label: 'Ronda actual', value: `${currentRoundIndex + 1}/${totalRounds}` },
    { label: 'Estado', value: state === 'running' ? 'En directo' : state === 'paused' ? 'Pausado' : state === 'finished' ? 'Finalizado' : 'Preparado' },
  ];

  const handlePlayPause = () => {
    if (state === 'paused') {
      resumeDebate();
    } else if (state === 'running') {
      pauseDebate();
    } else if (state === 'setup') {
      startDebate();
    }
  };

  return (
    <div className="app-shell flex min-h-screen flex-col overflow-hidden">
      <header className="border-b border-white/10 bg-slate-950/50 px-4 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5 text-white/70" />
              </button>
            )}

            <div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">{debateTopic}</h1>
              <p className="text-sm text-white/42">{teamAName} vs {teamBName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(isRecording || isProcessing) && (
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/68">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : <Mic className="h-4 w-4 animate-pulse text-[#FF6B00]" />}
                {isProcessing ? 'Analizando' : 'Grabando'}
              </div>
            )}

            <button
              onClick={() => setShowDashboard((prev) => !prev)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/74 transition-colors hover:bg-white/10"
            >
              <Sparkles className="h-4 w-4" />
              Dashboard
              {showDashboard ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-6 sm:px-6">
        <div className="grid w-full gap-4 xl:grid-cols-[1fr_360px_1fr]">
          <TeamCard
            teamId="A"
            teamName={teamAName}
            isActive={isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
          />

          <CentralPanel
            debateTopic={config.debateTopic}
            currentRoundType={currentRound?.roundType}
            activeTeam={state === 'setup' ? 'Preparación' : isTeamAActive ? teamAName : teamBName}
            roundNumber={currentRoundIndex + 1}
            totalRounds={totalRounds}
            isRunning={isTimerRunning}
            onPlayPause={handlePlayPause}
            onPrevious={() => goToNextTeamATurn()}
            onNext={() => goToNextTeamBTurn()}
            onEndDebate={() => {
              finishDebate();
              onFinish?.();
            }}
            hasNextTeamATurn={canNavigateToTeamATurn()}
            hasNextTeamBTurn={canNavigateToTeamBTurn()}
            isLastRound={isLastRound()}
            debateState={state}
          />

          <TeamCard
            teamId="B"
            teamName={teamBName}
            isActive={!isTeamAActive && state !== 'setup'}
            timeRemaining={timeRemaining}
            maxTime={currentRound?.duration || 180}
          />
        </div>
      </main>

      {(recordingError || audioError) && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
          {recordingError || audioError}
        </div>
      )}

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${showDashboard ? 'pointer-events-auto bg-black/62 backdrop-blur-md' : 'pointer-events-none bg-transparent'}`}
        onClick={() => setShowDashboard(false)}
      />

      <aside
        className={`fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-6xl rounded-t-[32px] border border-white/12 bg-slate-950 shadow-[0_-24px_80px_rgba(2,6,23,0.68)] transition-transform duration-300 ${
          showDashboard ? 'translate-y-0' : 'translate-y-[86%]'
        }`}
      >
        <div className="mx-auto max-h-[78vh] overflow-y-auto px-5 pb-6 pt-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              onClick={() => setShowDashboard((prev) => !prev)}
              className="mx-auto flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72"
            >
              <span className="h-1.5 w-10 rounded-full bg-white/20" />
              Dashboard
              {showDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDashboard && (
              <button
                onClick={() => setShowDashboard(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {sideStats.map((side) => (
              <div
                key={side.posture}
                className="rounded-[26px] border px-5 py-5"
                style={{
                  borderColor: `${side.accent}40`,
                  background: `linear-gradient(180deg, ${side.accent}18 0%, rgba(10,15,28,0.98) 100%)`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.26em]" style={{ color: side.accent }}>
                      {side.posture}
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">{side.teamName}</h3>
                  </div>
                  <p className="text-4xl font-semibold text-white">{formatCompactScore(side.averagePercent)}%</p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Puntos</p>
                    <p className="mt-2 text-lg font-semibold text-white">{side.totalPoints}/{side.totalMax}</p>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Fase</p>
                    <p className="mt-2 text-lg font-semibold text-white">{side.strongestPhase}</p>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">Análisis</p>
                    <p className="mt-2 text-lg font-semibold text-white">{side.interventions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {generalStats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/35">{item.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[26px] border border-white/12 bg-white/8 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.26em] text-white/38">Análisis</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Detalle de intervenciones</h3>
              </div>
              {currentRecording && (
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/62">
                  Última: {Math.round(currentRecording.duration)} s
                </span>
              )}
            </div>

            <div className="mt-4 space-y-3">
              {analysisResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/25 px-4 py-6 text-center text-sm text-white/45">
                  El dashboard se llenará cuando lleguen las primeras puntuaciones.
                </div>
              ) : (
                analysisResults.map((result, index) => {
                  const isExpanded = expandedAnalysisIndex === index;
                  const accent = normalizePosture(result.postura) === 'A Favor' ? '#FF6B00' : '#00E5FF';
                  return (
                    <div key={`${result.fase}-${index}`} className="overflow-hidden rounded-2xl border border-white/12 bg-slate-950/72">
                      <button
                        onClick={() => setExpandedAnalysisIndex(isExpanded ? null : index)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="h-3 w-3 rounded-full" style={{ background: accent, boxShadow: `0 0 16px ${accent}66` }} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{result.fase}</p>
                            <p className="mt-1 text-xs text-white/45">{result.postura} · {result.orador}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{result.total}/{result.max_total}</p>
                            <p className="text-xs text-white/45">{formatCompactScore(result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100)}%</p>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-white/10 px-4 py-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {result.criterios.map((criterio) => (
                              <div key={criterio.criterio} className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-sm font-medium text-white/85">{criterio.criterio}</p>
                                  <span className="text-sm font-semibold text-white">{criterio.nota}</span>
                                </div>
                                {criterio.anotacion && (
                                  <p className="mt-2 text-xs leading-5 text-white/50">{criterio.anotacion}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CompetitionScreen;
