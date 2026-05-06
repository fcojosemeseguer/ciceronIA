/**
 * CompetitionScreen - Debate en vivo con vista fija y dashboard compartido.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateTimer } from '../../hooks/useDebateTimer';
import { useAutoAudioRecording } from '../../hooks/useAutoAudioRecording';
import { useRealtimeAnalysis } from '../../hooks/useRealtimeAnalysis';
import { BrandHeader } from '../common';
import EmbeddedDebateDashboard from '../common/EmbeddedDebateDashboard';
import {
  AudioRecording,
  AnalysisResult,
  Debate,
  Project,
  ProjectDashboardResponse,
} from '../../types';
import { debatesService } from '../../api';
import { generateDebateRounds } from '../../utils/roundsSequence';
import { loadDebateTeamColors } from '../../utils/debateColors';
import {
  averageScore,
  buildDurationLookup,
  DashboardSlot,
  getDashboardSlotKey,
  getTeamFromPosture,
  mergeCriteriaNotes,
} from '../../utils/dashboardViewModel';
import { useDashboardShareLink } from '../../hooks/useDashboardShareLink';
import { ReactComponent as PlayIcon } from '../../assets/icons/icon-play.svg';
import { ReactComponent as PauseIcon } from '../../assets/icons/icon-pause.svg';
import { ReactComponent as NextIcon } from '../../assets/icons/icon-next.svg';

interface CompetitionScreenProps {
  project?: Project;
  debate?: Debate;
  onFinish?: () => void;
  onBack?: () => void;
  dashboardView?: boolean;
  onDashboardViewChange?: (value: boolean) => void;
}

const normalizeKey = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatTimer = (seconds: number) => {
  const absolute = Math.abs(seconds);
  const mins = Math.floor(absolute / 60);
  const secs = absolute % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
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
  const [dashboardData, setDashboardData] = useState<ProjectDashboardResponse | undefined>(undefined);
  const [localDashboardView, setLocalDashboardView] = useState(false);
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>(null);
  const autoOpenedSlotRef = useRef<string | null>(null);
  const previousStateRef = useRef(state);
  const isDashboardView = dashboardView ?? localDashboardView;
  const setDashboardView = onDashboardViewChange ?? setLocalDashboardView;

  const persistedColors = useMemo(() => {
    if (!debateCode) return null;
    return loadDebateTeamColors(debateCode);
  }, [debateCode]);

  const teamAColor = debate?.team_a_color || persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = debate?.team_b_color || persistedColors?.team_b_color || '#C44536';

  const {
    shareState,
    createShareLink,
    copyShareLink,
    openShareLink,
    dismissShareLink,
  } = useDashboardShareLink(debateCode);

  const handleAnalysisComplete = useCallback(
    (result: AnalysisResult, recording: AudioRecording) => {
      addAnalysisResult(result);
      updateAnalysisQueueStatus(recording.id, 'completed');
      setRecordingError(null);
    },
    [addAnalysisResult, updateAnalysisQueueStatus]
  );

  const { queueAnalysis } = useRealtimeAnalysis(debateData as Project, debateTypeId, handleAnalysisComplete);

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

  const { audioError, isRecording } = useAutoAudioRecording({
    debateCode,
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

  useEffect(() => {
    if (!debateCode) return;
    let cancelled = false;

    const loadDashboard = async () => {
      try {
        const response = await debatesService.getDebate(debateCode, {
          include_segments: true,
          include_metrics: false,
          include_transcript: false,
          limit: 100,
          offset: 0,
        });

        if (!cancelled) {
          setDashboardData(response.dashboard);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudo cargar el dashboard del debate en vivo', error);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [debateCode, analysisResults.length]);

  const teamAName = debate?.team_a_name || project?.team_a_name || getTeamName('A');
  const teamBName = debate?.team_b_name || project?.team_b_name || getTeamName('B');
  const debateName = (debate?.name && debate.name.trim()) || (project?.name && project.name.trim()) || 'Debate en vivo';
  const debateTopic = debate?.debate_topic || project?.debate_topic || config.debateTopic || 'Tema del debate';
  const currentRound = getCurrentRound();
  const rounds = useMemo(() => generateDebateRounds(config), [config]);
  const durationLookup = useMemo(
    () => buildDurationLookup(dashboardData?.segments.items, teamAName, teamBName),
    [dashboardData?.segments.items, teamAName, teamBName]
  );
  const segmentLookup = useMemo(() => {
    const lookup = new Map<string, NonNullable<ProjectDashboardResponse['segments']['items']>>();

    (dashboardData?.segments.items || []).forEach((segment) => {
      const team = getTeamFromPosture(segment.postura, teamAName, teamBName);
      if (!team) return;

      const key = getDashboardSlotKey(segment.fase_nombre, team);
      lookup.set(key, [...(lookup.get(key) || []), segment]);
    });

    return lookup;
  }, [dashboardData?.segments.items, teamAName, teamBName]);

  const roundsWithMeta = useMemo(
    () =>
      rounds.map((round, index) => ({
        ...round,
        idx: index,
        key: getDashboardSlotKey(round.roundType, round.team),
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

  const slots: DashboardSlot[] = useMemo(
    () =>
      roundsWithMeta.map((roundMeta) => {
        const slotResults = analysisResults.filter((result) => {
          if (normalizeKey(result.fase) !== normalizeKey(roundMeta.roundType)) return false;
          return getTeamFromPosture(result.postura, teamAName, teamBName) === roundMeta.team;
        });

        const slotRecordingIds = recordings
          .filter((recording) => recording.order === roundMeta.order && recording.team === roundMeta.team)
          .map((recording) => recording.id);

        const isAnalyzingSlot = analysisQueue.some(
          (item) => slotRecordingIds.includes(item.recordingId) && item.status === 'analyzing'
        );
        const isRecordingSlot = currentRoundIndex === roundMeta.idx && isRecording;
        const hasReachedSlot =
          roundMeta.idx <= currentRoundIndex || slotRecordingIds.length > 0 || slotResults.length > 0;

        const status = slotResults.length
          ? 'analyzed'
          : isRecordingSlot
            ? 'recording'
            : isAnalyzingSlot
              ? 'analyzing'
              : 'pending';

        return {
          key: roundMeta.key,
          phase: roundMeta.roundType,
          team: roundMeta.team,
          teamName: roundMeta.team === 'A' ? teamAName : teamBName,
          avg: averageScore(slotResults),
          status,
          durationSeconds: durationLookup.get(roundMeta.key) ?? null,
          isCurrent: currentRoundIndex === roundMeta.idx,
          isSelectable: hasReachedSlot || isAnalyzingSlot || isRecordingSlot,
          results: slotResults,
          segments: segmentLookup.get(roundMeta.key) || [],
        };
      }),
    [
      roundsWithMeta,
      analysisResults,
      recordings,
      analysisQueue,
      currentRoundIndex,
      isRecording,
      teamAName,
      teamBName,
      durationLookup,
      segmentLookup,
    ]
  );

  const selectedSlot = useMemo(
    () => slots.find((slot) => slot.key === selectedSlotKey) || null,
    [slots, selectedSlotKey]
  );

  const selectedCriteria = useMemo(
    () => mergeCriteriaNotes(selectedSlot?.results || []),
    [selectedSlot]
  );

  useEffect(() => {
    autoOpenedSlotRef.current = null;
    setSelectedCriterionId(null);
  }, [selectedSlotKey]);

  useEffect(() => {
    if (!selectedSlotKey || selectedCriteria.length === 0) return;
    if (autoOpenedSlotRef.current === selectedSlotKey) return;

    setSelectedCriterionId(selectedCriteria[0].id);
    autoOpenedSlotRef.current = selectedSlotKey;
  }, [selectedSlotKey, selectedCriteria]);

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

  if (!debateData) {
    return (
      <div className="app-shell app-fixed-screen">
        <div className="app-fixed-screen__body flex items-center justify-center">
          <div className="app-text-muted">Error: No se proporcionó debate ni proyecto</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell app-fixed-screen">
      <div className="app-fixed-screen__body px-5 py-6 sm:px-8">
        <div className="mx-auto flex h-full w-full max-w-[1240px] flex-col">
          <BrandHeader className="mb-5 shrink-0" />
          <h1 className="mb-5 shrink-0 text-center text-[38px] leading-none text-[#2C2C2C] sm:text-[52px]">
            {debateName}
          </h1>

          <div className="min-h-0 flex-1 overflow-hidden">
            <div
              className="flex h-full w-[200%] transition-transform duration-500 ease-out"
              style={{ transform: isDashboardView ? 'translateX(-50%)' : 'translateX(0)' }}
            >
              <section className="h-full w-1/2 pr-2">
                <div className="grid h-full gap-4 xl:grid-cols-[1fr_300px_1fr]">
                  <section
                    className="flex h-full flex-col rounded-[24px] px-6 py-5"
                    style={{ background: teamAColor, opacity: isTeamAActive ? 1 : 0.8 }}
                  >
                    <div>
                      <h2 className="text-center text-[34px] leading-none text-white sm:text-[46px]">
                        {teamAName}
                      </h2>
                      <div className="mx-auto mt-3 h-1 w-[72%] bg-white/85" />
                    </div>
                    <div className="my-auto">
                      <p
                        className={`text-center text-[74px] font-bold leading-none sm:text-[96px] ${
                          teamAOvertime ? 'timer-overtime-switch' : 'text-white'
                        }`}
                        style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                      >
                        {formatTimer(teamATime)}
                      </p>
                    </div>
                    <p className="text-center text-[18px] uppercase tracking-[0.14em] text-white/72">
                      {isTeamAActive ? 'Turno activo' : 'Esperando turno'}
                    </p>
                  </section>

                  <section className="flex h-full flex-col rounded-[24px] border-[4px] border-[#1C1D1F] bg-[#F5F5F3] px-4 py-4">
                    <div className="shrink-0">
                      <h3 className="text-center text-[30px] leading-tight text-[#2C2C2C] sm:text-[38px]">
                        {debateTopic}
                      </h3>
                      <p className="mt-2 text-center text-[34px] leading-none text-[#2C2C2C] sm:text-[42px]">
                        {`${currentRoundIndex + 1}/${totalRounds}`}
                      </p>
                    </div>

                    <div className="my-auto space-y-3">
                      <button
                        onClick={() => goToNextTeamATurn()}
                        disabled={!topActionEnabled}
                        className="flex h-[76px] w-full items-center justify-center rounded-[18px] border-[4px]"
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
                        className="flex h-[84px] w-full items-center justify-center rounded-[18px] border-[4px]"
                        style={{
                          background: isTimerRunning ? '#1C1D1F' : '#F5F5F3',
                          borderColor: '#1C1D1F',
                        }}
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
                        className="flex h-[76px] w-full items-center justify-center rounded-[18px] border-[4px] text-white"
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

                    <div className="shrink-0 rounded-[18px] bg-[#ECECE9] px-4 py-3 text-center">
                      <p className="text-sm uppercase tracking-[0.12em] text-[#2C2C2C]/55">Fase actual</p>
                      <p className="mt-1 text-[24px] leading-none text-[#2C2C2C]">
                        {currentRound?.roundType || 'Introduccion'}
                      </p>
                    </div>
                  </section>

                  <section
                    className="flex h-full flex-col rounded-[24px] px-6 py-5"
                    style={{ background: teamBColor, opacity: !isTeamAActive ? 1 : 0.8 }}
                  >
                    <div>
                      <h2 className="text-center text-[34px] leading-none text-white sm:text-[46px]">
                        {teamBName}
                      </h2>
                      <div className="mx-auto mt-3 h-1 w-[72%] bg-white/85" />
                    </div>
                    <div className="my-auto">
                      <p
                        className={`text-center text-[74px] font-bold leading-none sm:text-[96px] ${
                          teamBOvertime ? 'timer-overtime-switch' : 'text-white'
                        }`}
                        style={{ fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' }}
                      >
                        {formatTimer(teamBTime)}
                      </p>
                    </div>
                    <p className="text-center text-[18px] uppercase tracking-[0.14em] text-white/72">
                      {!isTeamAActive ? 'Turno activo' : 'Esperando turno'}
                    </p>
                  </section>
                </div>
              </section>

              <section className="h-full w-1/2 pl-2">
                <EmbeddedDebateDashboard
                  slots={slots}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  teamAColor={teamAColor}
                  teamBColor={teamBColor}
                  selectedSlotKey={selectedSlotKey}
                  onSelectSlot={setSelectedSlotKey}
                  onClearSelectedSlot={() => setSelectedSlotKey(null)}
                  criteria={selectedCriteria}
                  selectedCriterionId={selectedCriterionId}
                  onSelectCriterion={(criterionId) =>
                    setSelectedCriterionId((prev) => (prev === criterionId ? null : criterionId))
                  }
                  shareLabel="Compartir Dashboard en Vivo"
                  shareState={shareState}
                  onShare={createShareLink}
                  onCopyShare={copyShareLink}
                  onOpenShare={openShareLink}
                  onDismissShare={dismissShareLink}
                />
              </section>
            </div>
          </div>

          <div className="mt-4 flex justify-center shrink-0">
            <button
              type="button"
              aria-label="Cambiar vista"
              onClick={() => setDashboardView(!isDashboardView)}
              className="relative h-[34px] w-[78px] rounded-full border border-[#CFCFCD] bg-[#E3E3E1]"
            >
              <span
                className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
                style={{
                  left: '18px',
                  background: isDashboardView ? '#A9A9A7' : '#000000',
                }}
              />
              <span
                className="absolute top-1/2 h-[14px] w-[14px] -translate-y-1/2 rounded-full transition-all duration-300 ease-out"
                style={{
                  right: '18px',
                  background: isDashboardView ? '#000000' : '#A9A9A7',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {(recordingError || audioError) && (
        <div className="pointer-events-none fixed bottom-[118px] left-1/2 z-30 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200">
          {recordingError || audioError}
        </div>
      )}
    </div>
  );
};

export default CompetitionScreen;
