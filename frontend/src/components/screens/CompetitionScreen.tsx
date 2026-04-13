/**
 * CompetitionScreen - Debate en vivo con vista carrusel y dashboard visual.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
const scorePercentOf = (result: AnalysisResult) =>
  result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;

type PhaseMetric = {
  key: string;
  phase: string;
  team: 'A' | 'B';
  avg: number;
  hasAnalyzed: boolean;
  isAnalyzing: boolean;
  isCurrent: boolean;
  results: AnalysisResult[];
};

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
    analysisQueue,
    analysisResults,
  } = useDebateStore();

  const debateData = debate || project;
  const debateCode = debate?.code || project?.code || '';
  const debateTypeId = debate?.debate_type || project?.debate_type || 'upct';
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [localDashboardView, setLocalDashboardView] = useState(false);
  const [selectedPhaseKey, setSelectedPhaseKey] = useState<string | null>(null);
  const [selectedCriterionIndex, setSelectedCriterionIndex] = useState(0);
  const previousStateRef = useRef(state);
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
    const previous = previousStateRef.current;
    if (previous !== 'finished' && state === 'finished') {
      onFinish?.();
    }
    previousStateRef.current = state;
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

  const roundsWithMeta = useMemo(
    () =>
      rounds.map((round, index) => ({
        ...round,
        idx: index,
        key: `${normalizeKey(round.roundType)}::${round.team}::${round.order}::${index}`,
      })),
    [rounds]
  );

  const isTeamAActive = currentTeam === 'A';
  const teamATime = isTeamAActive ? timeRemaining : currentRound?.duration || 0;
  const teamBTime = !isTeamAActive ? timeRemaining : currentRound?.duration || 0;
  const teamAOvertime = isTeamAActive && timeRemaining < 0;
  const teamBOvertime = !isTeamAActive && timeRemaining < 0;
  const totalRounds = rounds.length || 8;
  const isLastRound = currentRoundIndex >= totalRounds - 1;
  const topActionEnabled = canNavigateToTeamATurn();
  const bottomActionEnabled = isLastRound || canNavigateToTeamBTurn();

  const phaseMetrics: PhaseMetric[] = roundsWithMeta.map((roundMeta) => {
    const phaseResults = analysisResults.filter((result) => {
      const samePhase = normalizeKey(result.fase) === normalizeKey(roundMeta.roundType);
      const posture = result.postura.trim().toLowerCase();
      const matchesTeam =
        (roundMeta.team === 'A' &&
          (posture.includes('favor') || posture === teamAName.trim().toLowerCase())) ||
        (roundMeta.team === 'B' &&
          (posture.includes('contra') || posture === teamBName.trim().toLowerCase()));
      return samePhase && matchesTeam;
    });
    const roundRecordingIds = recordings
      .filter((recording) => recording.order === roundMeta.order && recording.team === roundMeta.team)
      .map((recording) => recording.id);
    const isAnalyzing = analysisQueue.some(
      (item) => roundRecordingIds.includes(item.recordingId) && item.status === 'analyzing'
    );
    const avg = phaseResults.length
      ? phaseResults.reduce((sum, result) => sum + scorePercentOf(result), 0) / phaseResults.length
      : 0;
    return {
      key: roundMeta.key,
      phase: roundMeta.roundType,
      team: roundMeta.team,
      avg,
      hasAnalyzed: phaseResults.length > 0,
      isAnalyzing,
      isCurrent: currentRoundIndex === roundMeta.idx,
      results: phaseResults,
    };
  });

  const selectedPhase = phaseMetrics.find((phase) => phase.key === selectedPhaseKey) || null;

  useEffect(() => {
    setSelectedCriterionIndex(0);
  }, [selectedPhaseKey]);

  const teamAScorePercent = analysisResults
    .filter((result) => normalizePosture(result.postura) === 'A Favor')
    .reduce((sum, result, _, arr) => sum + scorePercentOf(result) / Math.max(1, arr.length), 0);
  const teamBScorePercent = analysisResults
    .filter((result) => normalizePosture(result.postura) === 'En Contra')
    .reduce((sum, result, _, arr) => sum + scorePercentOf(result) / Math.max(1, arr.length), 0);

  const teamAScore40 = Math.round((teamAScorePercent / 100) * 40);
  const teamBScore40 = Math.round((teamBScorePercent / 100) * 40);

  const chartPoints = phaseMetrics.map((metric, index) => ({
    x: 24 + index * (phaseMetrics.length > 1 ? 72 / (phaseMetrics.length - 1) : 0),
    y: 84 - Math.min(76, Math.max(6, metric.avg * 0.76)),
  }));
  const chartLine = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');

  const phaseTeamAScore40 = selectedPhase
    ? Math.round(
        (selectedPhase.results
          .filter((result) => normalizePosture(result.postura) === 'A Favor')
          .reduce((sum, result, _, arr) => sum + scorePercentOf(result) / Math.max(1, arr.length), 0) /
          100) *
          40
      )
    : 0;

  const phaseTeamBScore40 = selectedPhase
    ? Math.round(
        (selectedPhase.results
          .filter((result) => normalizePosture(result.postura) === 'En Contra')
          .reduce((sum, result, _, arr) => sum + scorePercentOf(result) / Math.max(1, arr.length), 0) /
          100) *
          40
      )
    : 0;

  const phaseCriteria = useMemo(() => {
    if (!selectedPhase) return [];
    const merged = new Map<string, { label: string; note: string }>();
    selectedPhase.results.forEach((result) => {
      result.criterios.forEach((criterio) => {
        const key = criterio.criterio.trim().toLowerCase();
        if (!merged.has(key)) {
          merged.set(key, { label: criterio.criterio, note: criterio.anotacion });
        }
      });
    });
    return Array.from(merged.values());
  }, [selectedPhase]);

  const formatTimer = (seconds: number) => {
    const absolute = Math.abs(seconds);
    const mins = Math.floor(absolute / 60);
    const secs = absolute % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (state === 'paused') resumeDebate();
    else if (state === 'running') pauseDebate();
    else if (state === 'setup') startDebate();
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
        <h1 className="mb-7 text-center text-[48px] leading-none text-[#2C2C2C] sm:text-[64px]">{debateName}</h1>

        <div className="overflow-hidden">
          <div
            className="flex w-[200%] transition-transform duration-500 ease-out"
            style={{ transform: isDashboardView ? 'translateX(-50%)' : 'translateX(0)' }}
          >
            <section className="w-1/2 pr-2">
              <div className="grid gap-6 xl:grid-cols-[1fr_320px_1fr]">
                <section className="rounded-[20px] px-6 py-5" style={{ background: teamAColor, opacity: isTeamAActive ? 1 : 0.76 }}>
                  <div className="h-[126px]">
                    <h2 className="text-center text-[38px] leading-none text-white sm:text-[52px]">{teamAName}</h2>
                    <div className="mx-auto mt-2 h-1 w-[72%] bg-white/85" />
                  </div>
                  <p
                    className={`mt-14 text-center text-[82px] font-bold leading-none sm:text-[108px] ${teamAOvertime ? 'timer-overtime-switch' : 'text-white'}`}
                    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                  >
                    {formatTimer(teamATime)}
                  </p>
                </section>

                <section className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F5F5F3] px-4 py-4">
                  <h3 className="text-center text-[38px] leading-none text-[#2C2C2C] sm:text-[48px]">{debateTopic}</h3>
                  <p className="mt-2 text-center text-[44px] leading-none text-[#2C2C2C] sm:text-[52px]">{`${currentRoundIndex + 1}/${totalRounds}`}</p>

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
                      <NextIcon aria-hidden className="h-10 w-10 rotate-180" style={{ color: topActionEnabled ? '#FFFFFF' : teamAColor }} />
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
                      <NextIcon aria-hidden className="h-10 w-10" style={{ color: bottomActionEnabled ? '#FFFFFF' : teamBColor }} />
                    </button>
                  </div>
                  <p className="mt-4 text-center text-[20px] text-[#2C2C2C]/70">{currentRound?.roundType || 'Introduccion'}</p>
                </section>

                <section className="rounded-[20px] px-6 py-5" style={{ background: teamBColor, opacity: !isTeamAActive ? 1 : 0.76 }}>
                  <div className="h-[126px]">
                    <h2 className="text-center text-[38px] leading-none text-white sm:text-[52px]">{teamBName}</h2>
                    <div className="mx-auto mt-2 h-1 w-[72%] bg-white/85" />
                  </div>
                  <p
                    className={`mt-14 text-center text-[82px] font-bold leading-none sm:text-[108px] ${teamBOvertime ? 'timer-overtime-switch' : 'text-white'}`}
                    style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                  >
                    {formatTimer(teamBTime)}
                  </p>
                </section>
              </div>
            </section>

            <section className="w-1/2 pl-2">
              <div className="rounded-[20px] border-[4px] border-[#1C1D1F] bg-[#F0F0EE] p-4">
                {!selectedPhase && (
                  <>
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_220px]">
                      <div className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[24px] text-[#2C2C2C]">{teamAName}:</span>
                          <span className="rounded-xl px-3 py-1 text-[28px] text-white" style={{ background: teamAColor }}>
                            {teamAScore40}
                            <span className="text-[16px] opacity-80">/40</span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[24px] text-[#2C2C2C]">{teamBName}:</span>
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
                        {phaseMetrics.filter((phase) => phase.team === 'A').map((phase) => {
                          const phaseRoundIdx = roundsWithMeta.find((r) => r.key === phase.key)?.idx ?? 999;
                          const isReached = phaseRoundIdx <= currentRoundIndex;
                          const teamColor = teamAColor;
                          return (
                          <button
                            key={`top-${phase.key}`}
                            type="button"
                            onClick={() => phase.hasAnalyzed && setSelectedPhaseKey(phase.key)}
                            className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white transition-transform hover:scale-[1.02]"
                            style={{
                              background: isReached ? teamColor : '#DADADA',
                              color: '#fff',
                              opacity: isReached ? 1 : 0.45,
                              cursor: phase.hasAnalyzed ? 'pointer' : 'default',
                            }}
                          >
                            {phase.phase}
                          </button>
                        )})}
                      </div>

                      <div className="relative mt-5">
                        <div className="h-[4px] w-full bg-[#2C2C2C]" />
                        <div className="absolute left-0 right-0 top-[-9px] flex items-center justify-between">
                          {phaseMetrics.map((phase) => (
                            <button
                              key={`status-${phase.key}`}
                              type="button"
                              onClick={() => phase.hasAnalyzed && setSelectedPhaseKey(phase.key)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border-2 bg-[#F0F0EE] transition-transform hover:scale-110"
                              style={{
                                borderColor: phase.hasAnalyzed ? '#3A7D44' : phase.isCurrent ? '#E6C068' : '#B8B8B6',
                                boxShadow: phase.isCurrent ? '0 0 0 3px rgba(230,192,104,0.28)' : 'none',
                                cursor: phase.hasAnalyzed ? 'pointer' : 'default',
                              }}
                              title={phase.hasAnalyzed ? 'Analizado' : phase.isCurrent ? 'Analizando' : 'Pendiente'}
                            >
                              {phase.hasAnalyzed ? (
                                <img src={checkIcon} alt="" aria-hidden className="h-3.5 w-3.5" />
                              ) : phase.isAnalyzing || phase.isCurrent ? (
                                <img src={loaderIcon} alt="" aria-hidden className="h-3.5 w-3.5 animate-spin" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-4 gap-2">
                        {phaseMetrics.filter((phase) => phase.team === 'B').map((phase) => {
                          const phaseRoundIdx = roundsWithMeta.find((r) => r.key === phase.key)?.idx ?? 999;
                          const isReached = phaseRoundIdx <= currentRoundIndex;
                          const teamColor = teamBColor;
                          return (
                          <button
                            key={`bottom-${phase.key}`}
                            type="button"
                            onClick={() => phase.hasAnalyzed && setSelectedPhaseKey(phase.key)}
                            className="rounded-[14px] px-2 py-2 text-center text-[24px] leading-none text-white transition-transform hover:scale-[1.02]"
                            style={{
                              background: isReached ? teamColor : '#DADADA',
                              color: '#fff',
                              opacity: isReached ? 1 : 0.45,
                              cursor: phase.hasAnalyzed ? 'pointer' : 'default',
                            }}
                          >
                            {phase.phase}
                          </button>
                        )})}
                      </div>
                    </div>
                  </>
                )}

                {selectedPhase && (
                  <div className="rounded-2xl px-4 py-4 text-white" style={{ background: selectedPhase.team === 'A' ? teamAColor : teamBColor }}>
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedPhaseKey(null)}
                        className="rounded-full bg-white/20 px-3 py-1 text-[28px] leading-none text-white"
                      >
                        ‹
                      </button>
                      <h3 className="text-[58px] leading-none">{selectedPhase.phase}</h3>
                      <div className="w-10" />
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[0.95fr_1fr_0.9fr]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                          <p className="text-[18px] leading-none">PTOS</p>
                          <p className="mt-2 text-[54px] leading-none">
                            {phaseTeamAScore40}
                            <span className="text-[26px] opacity-60">/40</span>
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                          <p className="text-[18px] leading-none">PTOS</p>
                          <p className="mt-2 text-[54px] leading-none">
                            {phaseTeamBScore40}
                            <span className="text-[26px] opacity-60">/40</span>
                          </p>
                        </div>
                        <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                          <p className="text-[18px] leading-none">DURACION</p>
                          <p className="mt-2 text-[54px] leading-none">{Math.floor((currentRound?.duration || 0) / 60)}:00</p>
                        </div>
                        <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                          <p className="text-[18px] leading-none">ENERGIA</p>
                          <p className="mt-2 text-[54px] leading-none">{Math.round(selectedPhase.avg || 0)}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3 text-[#1C1D1F]">
                        <div className="space-y-1">
                          {phaseCriteria.slice(0, 8).map((criterion, index) => (
                            <button
                              key={`phase-criterion-${criterion.label}`}
                              onClick={() => setSelectedCriterionIndex(index)}
                              className="flex w-full items-center justify-between rounded-lg px-2 py-1 text-left"
                              style={{ background: selectedCriterionIndex === index ? '#F1F1F0' : 'transparent' }}
                            >
                              <span className="text-[26px] leading-none">{criterion.label}</span>
                              <span className="text-[34px] leading-none">›</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3 text-[#2C2C2C]">
                        <p className="text-[22px] leading-tight">
                          {phaseCriteria[selectedCriterionIndex]?.note || 'Sin anotaciones para esta fase.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
