/**
 * Hook compuesto para manejar grabación automática durante rondas.
 * Si una intervención se pausa y luego se retoma, acumula segmentos y
 * solo envía un WAV final cuando la intervención termina de verdad.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAudioRecorder } from './useAudioRecorder';
import { useDebateStore } from '../store/debateStore';
import { AudioRecording } from '../types';
import {
  appendLiveDebateDraftSegment,
  clearLiveDebateDraft,
  getLiveDebateDraftMeta,
  loadLiveDebateDraft,
} from '../utils/debatePersistence';
import { mergeAudioSegmentsToWav } from '../utils/audioProcessing';

interface UseAutoAudioRecordingProps {
  debateCode?: string;
  onRecordingComplete?: (recording: AudioRecording) => void;
}

interface UseAutoAudioRecordingReturn {
  isRecording: boolean;
  audioError: string | null;
}

interface LiveRoundSnapshot {
  team: AudioRecording['team'];
  roundType: AudioRecording['roundType'];
  order: number;
}

const buildRoundId = (round: LiveRoundSnapshot | null | undefined) =>
  round ? `${round.team}-${round.roundType}-${round.order}` : '';

export const useAutoAudioRecording = (
  props?: UseAutoAudioRecordingProps
): UseAutoAudioRecordingReturn => {
  const { isRecording, startRecording, stopRecording, error } = useAudioRecorder();
  const {
    state: debateState,
    currentRoundIndex,
    isTimerRunning,
    timeRemaining,
    getCurrentRound,
    addRecording,
    addToAnalysisQueue,
  } = useDebateStore();

  const recordingStartedRef = useRef(false);
  const isStoppingRef = useRef(false);
  const activeRoundRef = useRef<LiveRoundSnapshot | null>(null);
  const finalizedRoundIdRef = useRef<string>('');
  const memoryDraftSegmentsRef = useRef<AudioRecording[]>([]);

  const consumeDraftSegments = useCallback(
    async (round: LiveRoundSnapshot) => {
      const roundId = buildRoundId(round);
      let persistedSegments: Blob[] = [];
      let persistedDuration = 0;

      if (props?.debateCode) {
        const draft = await loadLiveDebateDraft(props.debateCode);
        if (draft?.roundId === roundId) {
          persistedSegments = draft.segments.map((segment) => segment.blob);
          persistedDuration = draft.totalDuration;
          await clearLiveDebateDraft(props.debateCode);
        }
      } else {
        const matchingSegments = memoryDraftSegmentsRef.current.filter(
          (segment) =>
            segment.team === round.team &&
            segment.roundType === round.roundType &&
            segment.order === round.order
        );

        persistedSegments = matchingSegments
          .map((segment) => segment.blob)
          .filter((blob): blob is Blob => Boolean(blob));
        persistedDuration = matchingSegments.reduce((total, segment) => total + segment.duration, 0);
        memoryDraftSegmentsRef.current = [];
      }

      return {
        persistedSegments,
        persistedDuration,
      };
    },
    [props?.debateCode]
  );

  const persistPausedSegment = useCallback(
    async (round: LiveRoundSnapshot, segment: AudioRecording) => {
      const segmentBlob = segment.blob;
      if (!segmentBlob) return;

      const normalizedSegment: AudioRecording = {
        ...segment,
        team: round.team,
        roundType: round.roundType,
        order: round.order,
      };

      if (props?.debateCode) {
        await appendLiveDebateDraftSegment(
          {
            debateCode: props.debateCode,
            roundId: buildRoundId(round),
            team: round.team,
            roundType: round.roundType,
            order: round.order,
          },
          {
            id: normalizedSegment.id,
            blob: segmentBlob,
            duration: normalizedSegment.duration,
            createdAt: normalizedSegment.timestamp,
          }
        );
        return;
      }

      memoryDraftSegmentsRef.current = [...memoryDraftSegmentsRef.current, normalizedSegment];
    },
    [props?.debateCode]
  );

  const finalizeRoundRecording = useCallback(
    async (round: LiveRoundSnapshot, latestSegment: AudioRecording | null) => {
      const { persistedSegments, persistedDuration } = await consumeDraftSegments(round);
      const latestBlob = latestSegment?.blob ? [latestSegment.blob] : [];
      const allSegments = [...persistedSegments, ...latestBlob];
      const totalDuration = persistedDuration + (latestSegment?.duration || 0);

      if (allSegments.length === 0) {
        return;
      }

      const mergedBlob = await mergeAudioSegmentsToWav(allSegments);
      const recording: AudioRecording = {
        id: `recording_${Date.now()}`,
        team: round.team,
        roundType: round.roundType,
        order: round.order,
        timestamp: latestSegment?.timestamp || new Date().toISOString(),
        duration: totalDuration,
        blob: mergedBlob,
        url: URL.createObjectURL(mergedBlob),
      };

      addRecording(recording);
      addToAnalysisQueue(recording.id);
      props?.onRecordingComplete?.(recording);
    },
    [addRecording, addToAnalysisQueue, consumeDraftSegments, props]
  );

  useEffect(() => {
    if (!props?.debateCode) return;

    const currentRound = getCurrentRound();
    const currentRoundId = buildRoundId(currentRound);
    const persistedDraft = getLiveDebateDraftMeta(props.debateCode);

    if (persistedDraft && persistedDraft.roundId !== currentRoundId) {
      void clearLiveDebateDraft(props.debateCode);
    }
  }, [currentRoundIndex, getCurrentRound, props?.debateCode]);

  useEffect(() => {
    if (!error && !isRecording) return;
    if (error) {
      recordingStartedRef.current = false;
      isStoppingRef.current = false;
    }
  }, [error, isRecording]);

  useEffect(() => {
    if (isStoppingRef.current) return;
    if (isRecording || recordingStartedRef.current) return;
    if (debateState !== 'running' || !isTimerRunning) return;

    const currentRound = getCurrentRound();
    if (!currentRound) return;

    const currentRoundId = buildRoundId(currentRound);
    if (!currentRoundId || currentRoundId === finalizedRoundIdRef.current) return;

    activeRoundRef.current = {
      team: currentRound.team,
      roundType: currentRound.roundType,
      order: currentRound.order,
    };

    recordingStartedRef.current = true;
    void startRecording();
  }, [debateState, getCurrentRound, isRecording, isTimerRunning, startRecording]);

  useEffect(() => {
    if (!isRecording || !recordingStartedRef.current || isStoppingRef.current) return;

    const activeRound = activeRoundRef.current;
    if (!activeRound) return;

    const activeRoundId = buildRoundId(activeRound);
    const currentRound = getCurrentRound();
    const currentRoundId = buildRoundId(currentRound);
    const roundChanged = Boolean(currentRoundId && currentRoundId !== activeRoundId);
    const shouldFinalize = timeRemaining === 0 || roundChanged || debateState === 'finished';
    const shouldPause = !shouldFinalize && (debateState === 'paused' || !isTimerRunning);

    if (!shouldFinalize && !shouldPause) return;

    isStoppingRef.current = true;

    void stopRecording()
      .then(async (segment) => {
        const validSegment =
          segment && segment.duration >= 1
            ? {
                ...segment,
                team: activeRound.team,
                roundType: activeRound.roundType,
                order: activeRound.order,
              }
            : null;

        if (shouldFinalize) {
          finalizedRoundIdRef.current = activeRoundId;
          await finalizeRoundRecording(activeRound, validSegment);
        } else if (validSegment) {
          await persistPausedSegment(activeRound, validSegment);
          finalizedRoundIdRef.current = '';
        }
      })
      .catch((stopError) => {
        console.error('Error al detener la grabación automática:', stopError);
      })
      .finally(() => {
        isStoppingRef.current = false;
        recordingStartedRef.current = false;

        if (shouldFinalize) {
          activeRoundRef.current = null;
        }
      });
  }, [
    debateState,
    finalizeRoundRecording,
    getCurrentRound,
    isRecording,
    isTimerRunning,
    persistPausedSegment,
    stopRecording,
    timeRemaining,
  ]);

  return {
    isRecording,
    audioError: error,
  };
};
