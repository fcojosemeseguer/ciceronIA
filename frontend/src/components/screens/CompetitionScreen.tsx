/**
 * CompetitionScreen - Debate en vivo con vista carrusel y dashboard visual.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { useRealtimeAnalysis } from '../../hooks/useRealtimeAnalysis';
import { BrandHeader } from '../common';
import { AudioRecording, AnalysisResult, Debate, Project } from '../../types';
import { generateDebateRounds } from '../../utils/roundsSequence';
import { loadDebateTeamColors } from '../../utils/debateColors';
import { ReactComponent as PlayIcon } from '../../assets/icons/icon-play.svg';
import { ReactComponent as PauseIcon } from '../../assets/icons/icon-pause.svg';
import { ReactComponent as NextIcon } from '../../assets/icons/icon-next.svg';
import checkIcon from '../../assets/icons/icon-check.svg';
import loaderIcon from '../../assets/icons/icon-loader-lines-alt.svg';

interface CompetitionScreenProps {
  project?: Project;
  debate?: Debate;
  onFinish?: () => void;
  onBack?: () => void;
  dashboardView?: boolean;
  onDashboardViewChange?: (value: boolean) => void;
}

const normalizePosture = (postura: string) => (postura.toLowerCase().includes('favor') ? 'A Favor' : 'En Contra');
const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

export const CompetitionScreen: React.FC<CompetitionScreenProps> = ({
  project,
  debate,
  onFinish,
  dashboardView,
  onDashboardViewChange,
}) => {
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
    canNavigateToTeamATurn,
    canNavigateToTeamBTurn,
    addAnalysisResult,
    updateAnalysisQueueStatus,
    initializeDebateFromProject,
    initializeDebate,
    recordings,
    analysisResults,
  } = useDebateStore();

  const debateData = debate || project;
  const debateCode = debate?.code || project?.code || '';
  const debateTypeId = debate?.debate_type || project?.debate_type || 'upct';
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [localDashboardView, setLocalDashboardView] = useState(false);
  const isDashboardView = dashboardView ?? localDashboardView;
  const setDashboardView = onDashboardViewChange ?? setLocalDashboardView;

  const persistedColors = useMemo(() => {
    if (!debateCode) return null;
    return loadDebateTeamColors(debateCode);
  }, [debateCode]);
  const teamAColor = debate?.team_a_color || persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = debate?.team_b_color || persistedColors?.team_b_color || '#C44536';

  const handleAnalysisComplete = useCallback(
    (result: AnalysisResult, recording: AudioRecording) => {
      addAnalysisResult(result);
      updateAnalysisQueueStatus(recording.id, 'completed');
      setRecordingError(null);
    },
    [addAnalysisResult, updateAnalysisQueueStatus]
  );

  const { queueAnalysis } = useRealtimeAnalysis(debateData as any, debateTypeId, handleAnalysisComplete);
  useDebateTimer();

  const handleRecordingReady = useCallback(
    async (recording: AudioRecording) => {
      setRecordingError(null);
      updateAnalysisQueueStatus(recording.id, 'analyzing');

      try {
        await queueAnalysis(recording);
      } catch (error) {
        updateAnalysisQueueStatus(recording.id, 'error');
        setRecordingError(error instanceof Error ? error.message : 'No se pudo analizar la intervencion');
      }
    },
    [queueAnalysis, updateAnalysisQueueStatus]
  );

  const { audioError } = useAutoAudioRecording({
    onRecordingComplete: handleRecordingReady,
  });

  useEffect(() => {
    if (!debateData) return;

    if (debate) {
      const isRetor = debate.debate_type === 'retor';
      initializeDebate(
        {
          teamAName: debate.team_a_name,
          teamBName: debate.team_b_name,
          debateTopic: debate.debate_topic,
          roundDurations: isRetor
            ? { introduccion: 360, primerRefutador: 120, segundoRefutador: 300, conclusion: 180 }
            : { introduccion: 180, primerRefutador: 240, segundoRefutador: 240, conclusion: 180 },
        },
        debate.code
      );
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
      <div className="app-shell flex min-h-screen items-center justify-center">
        <div className="app-text-muted">Error: No se proporciono debate ni proyecto</div>
      </div>
    );
  }

  const teamAName = debate?.team_a_name || project?.team_a_name || getTeamName('A');
  const teamBName = debate?.team_b_name || project?.team_b_name || getTeamName('B');
  const debateName = (debate?.name && debate.name.trim()) || (project?.name && project.name.trim()) || 'Debate en vivo';
  const debateTopic = debate?.debate_topic || project?.debate_topic || config.debateTopic || 'Tema del debate';
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

  const isTeamAActive = currentTeam === 'A';
  const teamATime = isTeamAActive ? timeRemaining : currentRound?.duration || 0;
  const teamBTime = !isTeamAActive ? timeRemaining : currentRound?.duration || 0;
  const teamAOvertime = isTeamAActive && timeRemaining < 0;
  const teamBOvertime = !isTeamAActive && timeRemaining < 0;
  const totalRounds = rounds.length || 8;
  const isLastRound = currentRoundIndex >= totalRounds - 1;
  const canGoATurn = canNavigateToTeamATurn();
  const canGoBTurn = canNavigateToTeamBTurn();
  const topActionEnabled = canGoATurn;
  const bottomActionEnabled = isLastRound || canGoBTurn;

  const phaseMetrics = uniquePhases.map((phase) => {
    const key = normalizeKey(phase);
    const phaseResults = analysisResults.filter((result) => normalizeKey(result.fase) === key);
    const avg = phaseResults.length
      ? phaseResults.reduce((sum, result) => sum + (result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100), 0) / phaseResults.length
      : 0;
    const hasAnalyzed = phaseResults.length > 0;
    const isCurrent = normalizeKey(currentRound?.roundType || '') === key;
    return { key, phase, avg, hasAnalyzed, isCurrent };
  });

  const teamAScorePercent = analysisResults
    .filter((result) => normalizePosture(result.postura) === 'A Favor')
    .reduce((sum, result, _, arr) => {
      const value = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
      return sum + value / Math.max(1, arr.length);
    }, 0);
  const teamBScorePercent = analysisResults
    .filter((result) => normalizePosture(result.postura) === 'En Contra')
    .reduce((sum, result, _, arr) => {
      const value = result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;
      return sum + value / Math.max(1, arr.length);
    }, 0);

  const teamAScore40 = Math.round((teamAScorePercent / 100) * 40);
  const teamBScore40 = Math.round((teamBScorePercent / 100) * 40);
  const chartPoints = phaseMetrics.map((metric, index) => ({
    x: 24 + index * (phaseMetrics.length > 1 ? 72 / (phaseMetrics.length - 1) : 0),
    y: 84 - Math.min(76, Math.max(6, metric.avg * 0.76)),
  }));
  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  const formatTimer = (seconds: number) => {
    const absolute = Math.abs(seconds);
    const mins = Math.floor(absolute / 60);
    const secs = absolute % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (state === 'paused') {
      resumeDebate();
    } else if (state === 'running') {
      pauseDebate();
    } else if (state === 'setup') {
      startDebate();
    }
  };

  const handleBottomAction = () => {
    if (isLastRound) {
      finishDebate();
      return;
    }
    goToNextTeamBTurn();
  };

  return (
    <div className="app-shell min-h-screen overflow-y-auto pb-28">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
        <BrandHeader className="mb-7" />
        <h1 className="mb-7 text-center text-[48px] sm:text-[64px] leading-none text-[#2C2C2C]">{debateName}</h1>

        <div className="overflow-hidden">
          <div
            className="flex w-[200%] transition-transform duration-500 ease-out"
            style={{ transform: isDashboardView ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            <section className="w-1/2 pr-2">
              <div className="grid gap-6 xl:grid-cols-[1fr_320px_1fr]">
                <section className="rounded-[20px] px-6 py-5" style={{ background: teamAColor, opacity: isTeamAActive ? 1 : 0.76 }}>
                  <div className="h-[126px]">
                    <h2 className="text-center text-[38px] sm:text-[52px] leading-none text-white">{teamAName}</h2>
                    <div className="mx-auto mt-2 h-1 w-[72%] bg-white/85" />
                  </div>
                  <p
                    className={`mt-14 text-center text-[82px] sm:text-[108px] font-bold leading-none ${teamAOvertime ? 'timer-overtime-switch' : 'text-white'}`}
                    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                  >
                    {formatTimer(teamATime)}
                  </p>
                </section>

                <section className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F5F5F3] px-4 py-4">
                  <h3 className="text-center text-[38px] sm:text-[48px] leading-none text-[#2C2C2C]">{debateTopic}</h3>
                  <p className="mt-2 text-center text-[44px] sm:text-[52px] leading-none text-[#2C2C2C]">{`${currentRoundIndex + 1}/${totalRounds}`}</p>

                  <div className="mt-7 space-y-3">
                    <button
                      onClick={() => goToNextTeamATurn()}
                      disabled={!topActionEnabled}
                      className="flex h-[70px] w-full items-center justify-center rounded-[18px] border-[4px]"
                      style={{
                        borderColor: teamAColor,
                        background: topActionEnabled ? teamAColor : '#F5F5F3',
                      }}
                    >
                      <NextIcon
                        aria-hidden
                        className="h-10 w-10 rotate-180"
                        style={{ color: topActionEnabled ? '#FFFFFF' : teamAColor }}
                      />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="flex h-[70px] w-full items-center justify-center rounded-[18px] border-[4px]"
                      style={{ background: isTimerRunning ? '#1C1D1F' : '#F5F5F3', borderColor: '#1C1D1F' }}
                      aria-label={isTimerRunning ? 'Pausar' : 'Iniciar'}
                    >
                      {isTimerRunning ? (
                        <PauseIcon aria-hidden className="h-10 w-10" style={{ color: '#FFFFFF' }} />
                      ) : (
                        <PlayIcon aria-hidden className="h-10 w-10" style={{ color: '#1C1D1F' }} />
                      )}
                    </button>
                    <button
                      onClick={handleBottomAction}
                      disabled={!bottomActionEnabled}
                      className="flex h-[70px] w-full items-center justify-center rounded-[18px] border-[4px] text-white"
                      style={{
                        borderColor: isLastRound ? '#3A7D44' : teamBColor,
                        background: bottomActionEnabled ? (isLastRound ? '#3A7D44' : teamBColor) : '#F5F5F3',
                      }}
                    >
                      <NextIcon
                        aria-hidden
                        className="h-10 w-10"
                        style={{ color: bottomActionEnabled ? '#FFFFFF' : teamBColor }}
                      />
                    </button>
                  </div>
                  <p className="mt-4 text-center text-[20px] text-[#2C2C2C]/70">{currentRound?.roundType || 'Introduccion'}</p>
                </section>

                <section className="rounded-[20px] px-6 py-5" style={{ background: teamBColor, opacity: !isTeamAActive ? 1 : 0.76 }}>
                  <div className="h-[126px]">
                    <h2 className="text-center text-[38px] sm:text-[52px] leading-none text-white">{teamBName}</h2>
                    <div className="mx-auto mt-2 h-1 w-[72%] bg-white/85" />
                  </div>
                  <p
                    className={`mt-14 text-center text-[82px] sm:text-[108px] font-bold leading-none ${teamBOvertime ? 'timer-overtime-switch' : 'text-white'}`}
                    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                  >
                    {formatTimer(teamBTime)}
                  </p>
                </section>
              </div>
            </section>

            <section className="w-1/2 pl-2">
              <div className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] p-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
                  <div className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[24px] text-[#2C2C2C]">{teamAName}</span>
                      <span className="rounded-xl px-3 py-1 text-[28px] text-white" style={{ background: teamAColor }}>
                        {teamAScore40}
                        <span className="text-[16px] opacity-80">/40</span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[24px] text-[#2C2C2C]">{teamBName}</span>
                      <span className="rounded-xl px-3 py-1 text-[28px] text-white" style={{ background: teamBColor }}>
                        {teamBScore40}
                        <span className="text-[16px] opacity-80">/40</span>
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-3 py-2">
                    <p className="text-[28px] leading-none text-[#2C2C2C]">Ptos</p>
                    <svg viewBox="0 0 100 100" className="mt-2 h-[120px] w-full">
                      <line x1="12" y1="8" x2="12" y2="88" stroke="#2C2C2C" strokeWidth="1.8" />
                      <line x1="12" y1="88" x2="94" y2="88" stroke="#2C2C2C" strokeWidth="1.8" />
                      {chartLine && <polyline fill="none" stroke={teamAColor} strokeWidth="2.4" points={chartLine} />}
                      {chartPoints.map((point, index) => (
                        <circle key={`point-${index}`} cx={point.x} cy={point.y} r="2.2" fill={teamAColor} />
                      ))}
                    </svg>
                    <p className="text-center text-[30px] leading-none text-[#2C2C2C]">Rondas</p>
                  </div>

                  <button className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-4 text-center text-[#2C2C2C]">
                    <p className="text-[44px] leading-tight">Compartir Dashboard En Vivo</p>
                    <span className="mt-2 inline-block text-[44px]">↗</span>
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-4">
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    {phaseMetrics.map((phase) => (
                      <div
                        key={`top-${phase.key}`}
                        className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white"
                        style={{ background: phase.isCurrent ? teamAColor : '#DADADA', color: phase.isCurrent ? '#fff' : '#F5F5F3' }}
                      >
                        {phase.phase}
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-5">
                    <div className="h-[4px] w-full bg-[#2C2C2C]" />
                    <div className="absolute left-0 right-0 top-[-9px] flex items-center justify-between">
                      {phaseMetrics.map((phase) => (
                        <div
                          key={`status-${phase.key}`}
                          className="flex h-6 w-6 items-center justify-center rounded-full border-2 bg-[#F0F0EE]"
                          style={{
                            borderColor: phase.hasAnalyzed ? '#3A7D44' : phase.isCurrent ? '#E6C068' : '#B8B8B6',
                            boxShadow: phase.isCurrent ? '0 0 0 3px rgba(230,192,104,0.28)' : 'none',
                          }}
                          title={phase.hasAnalyzed ? 'Analizado' : phase.isCurrent ? 'Analizando' : 'Pendiente'}
                        >
                          {phase.hasAnalyzed ? (
                            <img src={checkIcon} alt="" aria-hidden className="h-3.5 w-3.5" style={{ filter: 'brightness(0) saturate(100%) invert(42%) sepia(34%) saturate(676%) hue-rotate(77deg) brightness(91%) contrast(91%)' }} />
                          ) : phase.isCurrent ? (
                            <img src={loaderIcon} alt="" aria-hidden className="h-3.5 w-3.5 animate-spin" style={{ filter: 'brightness(0) saturate(100%) invert(76%) sepia(40%) saturate(494%) hue-rotate(356deg) brightness(95%) contrast(88%)' }} />
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {phaseMetrics.map((phase) => (
                      <div
                        key={`bottom-${phase.key}`}
                        className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white"
                        style={{ background: phase.isCurrent ? teamBColor : '#DADADA', color: phase.isCurrent ? '#fff' : '#F5F5F3' }}
                      >
                        {phase.phase}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            aria-label="Cambiar vista"
            onClick={() => setDashboardView(!isDashboardView)}
            className="relative h-[34px] w-[78px] rounded-full border border-[#CFCFCD] bg-[#E3E3E1]"
          >
            <span
              className="absolute top-1/2 h-[20px] w-[20px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
              style={{ left: '18px', width: 14, height: 14, background: isDashboardView ? '#A9A9A7' : '#000000' }}
            />
            <span
              className="absolute top-1/2 h-[20px] w-[20px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
              style={{ right: '18px', width: 14, height: 14, background: isDashboardView ? '#000000' : '#A9A9A7' }}
            />
          </button>
        </div>
      </div>

      {(recordingError || audioError) && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
          {recordingError || audioError}
        </div>
      )}
    </div>
  );
};

export default CompetitionScreen;
