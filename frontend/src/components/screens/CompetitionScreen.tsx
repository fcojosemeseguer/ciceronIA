/**
 * CompetitionScreen - Vista de debate en vivo con dashboard visual tipo arena.
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
import { generateDebateRounds } from '../../utils/roundsSequence';

interface CompetitionScreenProps {
  project?: Project;
  debate?: Debate;
  onFinish?: () => void;
  onBack?: () => void;
}

const formatCompactScore = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : '0.0');
const normalizePosture = (postura: string) => (postura.toLowerCase().includes('favor') ? 'A Favor' : 'En Contra');
const formatDuration = (seconds: number) => `${Math.round((seconds || 0) / 60)} min`;
const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

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
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string | null>(null);
  const [currentRecording, setCurrentRecording] = useState<AudioRecording | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [expandedAnalysisIndex, setExpandedAnalysisIndex] = useState<number | null>(null);

  const debateData = debate || project;
  const debateTypeId = debate?.debate_type || project?.debate_type || 'upct';

  const handleAnalysisComplete = useCallback((result: AnalysisResult, recording: AudioRecording) => {
    addAnalysisResult(result);
    updateAnalysisQueueStatus(recording.id, 'completed');
    setCurrentRecording(recording);
    setRecordingError(null);
  }, [addAnalysisResult, updateAnalysisQueueStatus]);

  const { queueAnalysis, isProcessing } = useRealtimeAnalysis(debateData as any, debateTypeId, handleAnalysisComplete);
  useDebateTimer();

  const handleRecordingReady = useCallback(async (recording: AudioRecording) => {
    setCurrentRecording(recording);
    setRecordingError(null);
    updateAnalysisQueueStatus(recording.id, 'analyzing');

    try {
      await queueAnalysis(recording);
    } catch (error) {
      updateAnalysisQueueStatus(recording.id, 'error');
      setRecordingError(error instanceof Error ? error.message : 'No se pudo analizar la intervencion');
    }
  }, [queueAnalysis, updateAnalysisQueueStatus]);

  const { isRecording, audioError } = useAutoAudioRecording({
    onRecordingComplete: handleRecordingReady,
  });

  useEffect(() => {
    if (!debateData) return;

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
  }, [debateData, debate, project, initializeDebate, initializeDebateFromProject]);

  useEffect(() => {
    if (state === 'finished') onFinish?.();
  }, [state, onFinish]);

  useEffect(() => {
    if (audioError) setRecordingError(audioError);
  }, [audioError]);

  if (!debateData) {
    return (
      <div className="app-shell flex items-center justify-center">
        <div className="app-text-muted">Error: No se proporciono debate ni proyecto</div>
      </div>
    );
  }

  const teamAName = debate?.team_a_name || project?.team_a_name || getTeamName('A');
  const teamBName = debate?.team_b_name || project?.team_b_name || getTeamName('B');
  const debateTopic = debate?.debate_topic || debate?.name || project?.debate_topic || project?.name || 'Tema del debate';
  const isTeamAActive = currentTeam === 'A';
  const totalRounds = 8;
  const currentRound = getCurrentRound();
  const rounds = useMemo(() => generateDebateRounds(config), [config]);

  const uniquePhases = useMemo(() => {
    const seen = new Set<string>();
    return rounds
      .map((round) => round.roundType)
      .filter((phase) => {
        const key = normalizeKey(phase);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [rounds]);

  const teamSummaries = useMemo(() => {
    const build = (posture: 'A Favor' | 'En Contra', teamName: string, accent: string) => {
      const results = analysisResults.filter((result) => normalizePosture(result.postura) === posture);
      const avg = results.length
        ? results.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / results.length
        : 0;
      return {
        teamName,
        accent,
        avg,
        count: results.length,
      };
    };

    return {
      a: build('A Favor', teamAName, '#FF6B00'),
      b: build('En Contra', teamBName, '#00E5FF'),
    };
  }, [analysisResults, teamAName, teamBName]);

  const phaseCards = useMemo(() => {
    return uniquePhases.map((phase) => {
      const key = normalizeKey(phase);
      const phaseResults = analysisResults.filter((result) => {
        const resultKey = normalizeKey(result.fase);
        return resultKey === key || resultKey.includes(key) || key.includes(resultKey);
      });
      const aResults = phaseResults.filter((result) => normalizePosture(result.postura) === 'A Favor');
      const bResults = phaseResults.filter((result) => normalizePosture(result.postura) === 'En Contra');
      const aAvg = aResults.length
        ? aResults.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / aResults.length
        : 0;
      const bAvg = bResults.length
        ? bResults.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / bResults.length
        : 0;
      const maxPhase = Math.max(aAvg, bAvg, 1);
      const aRoundIndex = rounds.findIndex((round) => round.team === 'A' && normalizeKey(round.roundType) === key);
      const bRoundIndex = rounds.findIndex((round) => round.team === 'B' && normalizeKey(round.roundType) === key);
      const current = normalizeKey(currentRound?.roundType || '') === key && state !== 'finished';
      const completed = state === 'finished' || (aRoundIndex >= 0 && currentRoundIndex > aRoundIndex && bRoundIndex >= 0 && currentRoundIndex > bRoundIndex);
      const analyzed = aResults.length > 0 || bResults.length > 0;

      const latestA = aResults.length ? aResults[aResults.length - 1] : null;
      const latestB = bResults.length ? bResults[bResults.length - 1] : null;
      const insightA = latestA?.criterios.find((criterio) => criterio.anotacion)?.anotacion || 'Sin anotacion por ahora.';
      const insightB = latestB?.criterios.find((criterio) => criterio.anotacion)?.anotacion || 'Sin anotacion por ahora.';

      return {
        key,
        phase,
        current,
        completed,
        analyzed,
        aAvg,
        bAvg,
        aWidth: `${(aAvg / maxPhase) * 100}%`,
        bWidth: `${(bAvg / maxPhase) * 100}%`,
        aResults,
        bResults,
        latestA,
        latestB,
        insightA,
        insightB,
      };
    });
  }, [analysisResults, uniquePhases, rounds, currentRound, currentRoundIndex, state]);

  const selectedPhase = phaseCards.find((phase) => phase.key === selectedPhaseKey) || null;
  const globalAverageScore = analysisResults.length
    ? analysisResults.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / analysisResults.length
    : 0;
  const winningTeam = teamSummaries.a.avg === teamSummaries.b.avg
    ? 'Empate'
    : teamSummaries.a.avg > teamSummaries.b.avg
      ? teamSummaries.a.teamName
      : teamSummaries.b.teamName;
  const scoreBySpeaker = useMemo(() => {
    const speakerMap = new Map<string, { total: number; count: number }>();
    analysisResults.forEach((result) => {
      const current = speakerMap.get(result.orador) || { total: 0, count: 0 };
      const score = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
      speakerMap.set(result.orador, { total: current.total + score, count: current.count + 1 });
    });
    return Array.from(speakerMap.entries()).map(([speaker, data]) => ({
      speaker,
      score: data.count ? data.total / data.count : 0,
    }));
  }, [analysisResults]);
  const maxSpeakerScore = Math.max(1, ...scoreBySpeaker.map((item) => item.score));
  const maxPhaseScore = Math.max(1, ...phaseCards.map((phase) => Math.max(phase.aAvg, phase.bAvg)));
  const timelineSegments = analysisResults.map((result, index) => {
    const score = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
    const isTeamA = normalizePosture(result.postura) === 'A Favor';
    const accent = isTeamA ? '#00E5FF' : '#FF6B00';
    const opacity = 0.28 + (score / 100) * 0.68;
    return {
      id: `${result.fase}-${result.orador}-${index}`,
      fase: result.fase,
      orador: result.orador,
      score,
      accent,
      opacity,
      width: `${28 + score * 0.72}px`,
      posture: result.postura,
    };
  });

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
      <header className="live-topbar px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="live-chip rounded-xl p-2 transition-colors">
                <ArrowLeft className="h-5 w-5" style={{ color: 'var(--app-text-muted)' }} />
              </button>
            )}

            <div>
              <h1 className="text-xl font-semibold sm:text-2xl" style={{ color: 'var(--app-text)' }}>{debateTopic}</h1>
              <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>{teamAName} vs {teamBName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(isRecording || isProcessing) && (
              <div className="live-chip flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-blue-400" /> : <Mic className="h-4 w-4 animate-pulse text-[#FF6B00]" />}
                {isProcessing ? 'Analizando' : 'Grabando'}
              </div>
            )}

            <button
              onClick={() => {
                setShowDashboard((prev) => !prev);
                if (showDashboard) setSelectedPhaseKey(null);
              }}
              className="live-chip flex items-center gap-2 rounded-2xl px-4 py-2 transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              Dashboard
              {showDashboard ? <ChevronDown className="h-4 w-4 rotate-180" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-6 sm:px-6 live-animate-in">
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
            activeTeam={state === 'setup' ? 'Preparacion' : isTeamAActive ? teamAName : teamBName}
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
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200 backdrop-blur-xl">
          {recordingError || audioError}
        </div>
      )}

      <div
        className={`fixed inset-0 z-40 transition-all duration-300 ${showDashboard ? 'pointer-events-auto bg-black/52 backdrop-blur-md' : 'pointer-events-none bg-transparent'}`}
        onClick={() => {
          setShowDashboard(false);
          setSelectedPhaseKey(null);
        }}
      />

      <section
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-all duration-300 ${
          showDashboard ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <div
          className={`live-panel-soft mx-auto w-full max-w-6xl rounded-[30px] border shadow-[0_24px_80px_rgba(2,6,23,0.45)] transition-all duration-300 ${
            showDashboard ? 'translate-y-0 scale-100' : 'translate-y-4 scale-[0.98]'
          }`}
          style={{ borderColor: 'var(--app-border)' }}
        >
        <div className="mx-auto max-h-[86vh] overflow-y-auto px-5 pb-6 pt-4 sm:px-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              onClick={() => {
                if (selectedPhaseKey) {
                  setSelectedPhaseKey(null);
                  setExpandedAnalysisIndex(null);
                } else {
                  setShowDashboard((prev) => !prev);
                }
              }}
              className="live-chip mx-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              {selectedPhaseKey ? 'Volver al resumen' : 'Dashboard'}
              {selectedPhaseKey ? <ArrowLeft className="h-4 w-4" /> : showDashboard ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDashboard && (
              <button
                onClick={() => {
                  setShowDashboard(false);
                  setSelectedPhaseKey(null);
                }}
                className="live-chip rounded-xl p-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: selectedPhase ? 'translateX(-100%)' : 'translateX(0)' }}
            >
              <section className="min-w-full">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Average Score</p>
                    <p className="mt-2 text-3xl font-semibold" style={{ color: 'var(--app-text)' }}>{formatCompactScore(globalAverageScore)}%</p>
                  </div>
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Total Segments</p>
                    <p className="mt-2 text-3xl font-semibold" style={{ color: 'var(--app-text)' }}>{analysisResults.length}</p>
                  </div>
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Total Duration</p>
                    <p className="mt-2 text-3xl font-semibold" style={{ color: 'var(--app-text)' }}>{formatDuration(recordings.reduce((sum, item) => sum + item.duration, 0))}</p>
                  </div>
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Winning Team</p>
                    <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--app-text)' }}>{winningTeam}</p>
                  </div>
                </div>

                <div className="rounded-[24px] border px-5 py-5" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Marcador general</p>
                      <h3 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--app-text)' }}>Arena de puntuaciones</h3>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--app-text-muted)' }}>
                      {analysisResults.length} intervenciones analizadas · {formatDuration(recordings.reduce((sum, item) => sum + item.duration, 0))}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border px-4 py-4" style={{ borderColor: `${teamSummaries.a.accent}50`, background: `${teamSummaries.a.accent}14` }}>
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: teamSummaries.a.accent }}>A favor</p>
                      <h4 className="mt-2 text-xl font-semibold" style={{ color: 'var(--app-text)' }}>{teamSummaries.a.teamName}</h4>
                      <div className="mt-4 h-2 rounded-full bg-black/10">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${teamSummaries.a.avg}%`, background: teamSummaries.a.accent }} />
                      </div>
                      <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--app-text)' }}>{formatCompactScore(teamSummaries.a.avg)}%</p>
                    </div>

                    <div className="rounded-2xl border px-4 py-4" style={{ borderColor: `${teamSummaries.b.accent}50`, background: `${teamSummaries.b.accent}14` }}>
                      <p className="text-xs uppercase tracking-[0.2em]" style={{ color: teamSummaries.b.accent }}>En contra</p>
                      <h4 className="mt-2 text-xl font-semibold" style={{ color: 'var(--app-text)' }}>{teamSummaries.b.teamName}</h4>
                      <div className="mt-4 h-2 rounded-full bg-black/10">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${teamSummaries.b.avg}%`, background: teamSummaries.b.accent }} />
                      </div>
                      <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--app-text)' }}>{formatCompactScore(teamSummaries.b.avg)}%</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--app-text-muted)' }}>Score by fase</p>
                    <div className="mt-4 space-y-3">
                      {phaseCards.map((phase) => {
                        const phaseScore = (phase.aAvg + phase.bAvg) / 2;
                        return (
                          <div key={`phase-score-${phase.key}`}>
                            <p className="text-xs" style={{ color: 'var(--app-text)' }}>{phase.phase}</p>
                            <div className="mt-1 h-1.5 rounded-full bg-black/10">
                              <div className="h-1.5 rounded-full bg-slate-400" style={{ width: `${(phaseScore / maxPhaseScore) * 100}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--app-text-muted)' }}>Score by postura</p>
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: '#00E5FF' }}>A favor</span>
                          <span style={{ color: 'var(--app-text)' }}>{formatCompactScore(teamSummaries.a.avg)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-black/10">
                          <div className="h-1.5 rounded-full" style={{ width: `${teamSummaries.a.avg}%`, background: '#00E5FF' }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span style={{ color: '#FF6B00' }}>En contra</span>
                          <span style={{ color: 'var(--app-text)' }}>{formatCompactScore(teamSummaries.b.avg)}%</span>
                        </div>
                        <div className="mt-1 h-1.5 rounded-full bg-black/10">
                          <div className="h-1.5 rounded-full" style={{ width: `${teamSummaries.b.avg}%`, background: '#FF6B00' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                    <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--app-text-muted)' }}>Score by orador</p>
                    <div className="mt-4 space-y-3">
                      {scoreBySpeaker.slice(0, 4).map((speaker) => (
                        <div key={speaker.speaker}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate pr-2" style={{ color: 'var(--app-text)' }}>{speaker.speaker}</span>
                            <span style={{ color: 'var(--app-text)' }}>{formatCompactScore(speaker.score)}%</span>
                          </div>
                          <div className="mt-1 h-1.5 rounded-full bg-black/10">
                            <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${(speaker.score / maxSpeakerScore) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border px-4 py-4" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: 'var(--app-text-muted)' }}>Debate timeline</p>
                  <div className="mt-4 overflow-x-auto">
                    <div className="flex min-w-max items-center gap-2">
                      {timelineSegments.map((segment) => (
                        <div
                          key={segment.id}
                          title={`${segment.fase} · ${segment.orador} · ${formatCompactScore(segment.score)}%`}
                          className="rounded-lg border px-2 py-2 text-[11px] transition-transform duration-200 hover:-translate-y-0.5"
                          style={{
                            width: segment.width,
                            borderColor: `${segment.accent}80`,
                            background: `linear-gradient(180deg, ${segment.accent}${Math.round(segment.opacity * 255).toString(16).padStart(2, '0')} 0%, color-mix(in srgb, var(--app-bg-solid) 90%, transparent) 100%)`,
                            color: 'var(--app-text)',
                          }}
                        >
                          <p className="truncate font-semibold">{segment.orador}</p>
                          <p className="truncate opacity-75">{segment.fase}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {phaseCards.map((phase) => (
                    <button
                      key={phase.key}
                      onClick={() => {
                        setSelectedPhaseKey(phase.key);
                        setExpandedAnalysisIndex(null);
                      }}
                      className="rounded-2xl border px-4 py-4 text-left transition-all duration-300 hover:-translate-y-1"
                      style={{
                        borderColor: phase.analyzed ? 'rgba(16,185,129,0.6)' : phase.current ? '#94a3b8' : 'var(--app-border)',
                        background: phase.analyzed
                          ? 'linear-gradient(180deg, rgba(16,185,129,0.16) 0%, var(--app-surface) 100%)'
                          : phase.current
                            ? 'linear-gradient(180deg, rgba(148,163,184,0.18) 0%, var(--app-surface) 100%)'
                            : 'var(--app-surface)',
                        opacity: phase.completed || phase.analyzed || phase.current ? 1 : 0.7,
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>{phase.phase}</p>
                      <div className="mt-3 space-y-2">
                        <div className="h-1.5 rounded-full bg-black/10">
                          <div className="h-1.5 rounded-full" style={{ width: phase.aWidth, background: '#FF6B00' }} />
                        </div>
                        <div className="h-1.5 rounded-full bg-black/10">
                          <div className="h-1.5 rounded-full" style={{ width: phase.bWidth, background: '#00E5FF' }} />
                        </div>
                      </div>
                      <p className="mt-3 text-xs" style={{ color: 'var(--app-text-muted)' }}>
                        {phase.analyzed ? 'Analizada' : phase.current ? 'En curso' : phase.completed ? 'Completada' : 'Pendiente'}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="min-w-full pl-0 md:pl-2">
                {selectedPhase ? (
                  <div className="space-y-4">
                    <div className="rounded-[24px] border px-5 py-5" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--app-text-muted)' }}>Fase</p>
                          <h3 className="mt-2 text-2xl font-semibold" style={{ color: 'var(--app-text)' }}>{selectedPhase.phase}</h3>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedPhaseKey(null);
                            setExpandedAnalysisIndex(null);
                          }}
                          className="live-chip rounded-full px-3 py-1.5 text-xs"
                        >
                          Volver
                        </button>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border px-4 py-4" style={{ borderColor: '#FF6B0050', background: '#FF6B0014' }}>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#FF6B00' }}>A favor</p>
                          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--app-text)' }}>{formatCompactScore(selectedPhase.aAvg)}%</p>
                          <p className="mt-3 text-xs leading-5" style={{ color: 'var(--app-text-muted)' }}>{selectedPhase.insightA}</p>
                        </div>
                        <div className="rounded-2xl border px-4 py-4" style={{ borderColor: '#00E5FF50', background: '#00E5FF14' }}>
                          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#00E5FF' }}>En contra</p>
                          <p className="mt-2 text-2xl font-semibold" style={{ color: 'var(--app-text)' }}>{formatCompactScore(selectedPhase.bAvg)}%</p>
                          <p className="mt-3 text-xs leading-5" style={{ color: 'var(--app-text-muted)' }}>{selectedPhase.insightB}</p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[24px] border px-5 py-5" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>Detalle de analisis de la fase</p>
                        <p className="text-xs" style={{ color: 'var(--app-text-muted)' }}>
                          {(selectedPhase.aResults.length + selectedPhase.bResults.length)} intervenciones
                        </p>
                      </div>

                      <div className="space-y-3">
                        {[...selectedPhase.aResults, ...selectedPhase.bResults].length === 0 ? (
                          <div className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm" style={{ borderColor: 'var(--app-border)', color: 'var(--app-text-muted)' }}>
                            Aun no hay analisis para esta fase.
                          </div>
                        ) : (
                          [...selectedPhase.aResults, ...selectedPhase.bResults].map((result, index) => {
                            const isExpanded = expandedAnalysisIndex === index;
                            const accent = normalizePosture(result.postura) === 'A Favor' ? '#FF6B00' : '#00E5FF';
                            return (
                              <div key={`${result.fase}-${result.orador}-${index}`} className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--app-border)', background: 'color-mix(in srgb, var(--app-bg-solid) 68%, transparent)' }}>
                                <button
                                  onClick={() => setExpandedAnalysisIndex(isExpanded ? null : index)}
                                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="h-3 w-3 rounded-full" style={{ background: accent }} />
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium" style={{ color: 'var(--app-text)' }}>{result.postura} · {result.orador}</p>
                                      <p className="mt-1 text-xs" style={{ color: 'var(--app-text-muted)' }}>{result.fase}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-semibold" style={{ color: 'var(--app-text)' }}>
                                      {formatCompactScore(result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100)}%
                                    </p>
                                    {isExpanded ? <ChevronUp className="h-4 w-4" style={{ color: 'var(--app-text-muted)' }} /> : <ChevronDown className="h-4 w-4" style={{ color: 'var(--app-text-muted)' }} />}
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="border-t px-4 py-4" style={{ borderColor: 'var(--app-border)' }}>
                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                      {result.criterios.map((criterio, criterioIndex) => {
                                        const ratio = Math.max(0, Math.min(100, (criterio.nota / 4) * 100));
                                        return (
                                          <div key={`${criterio.criterio}-${criterioIndex}`} className="rounded-2xl border px-4 py-3" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)' }}>
                                            <p className="text-xs font-medium" style={{ color: 'var(--app-text)' }}>{criterio.criterio}</p>
                                            <div className="mt-3 h-1.5 rounded-full bg-black/10">
                                              <div className="h-1.5 rounded-full" style={{ width: `${ratio}%`, background: accent }} />
                                            </div>
                                            {criterio.anotacion && (
                                              <p className="mt-3 text-xs leading-5" style={{ color: 'var(--app-text-muted)' }}>{criterio.anotacion}</p>
                                            )}
                                          </div>
                                        );
                                      })}
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
                ) : (
                  <div className="rounded-[24px] border px-5 py-6 text-center text-sm" style={{ borderColor: 'var(--app-border)', background: 'var(--app-surface)', color: 'var(--app-text-muted)' }}>
                    Selecciona una fase para abrir su vista detallada.
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
};

export default CompetitionScreen;
