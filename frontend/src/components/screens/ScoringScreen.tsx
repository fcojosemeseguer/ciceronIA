/**
 * ScoringScreen - Pantalla final de evaluacion.
 * Mantiene funcionalidad de evaluacion manual y resultados de analisis automatico
 * con la estetica unificada de la app.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Edit3,
  Loader2,
  Mic,
  Save,
  Trophy,
} from 'lucide-react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateHistoryStore } from '../../store/debateHistoryStore';
import { useAuthStore } from '../../store/authStore';
import { debatesService } from '../../api/debates';
import {
  DEBATE_RUBRIC,
  DebateScoringResult,
  DetailedTeamScore,
  Debate,
  AnalysisResult,
  CriterioResult,
  ProjectSegment,
  RubricRoundType,
  SpeakerRoundScore,
  TeamPosition,
} from '../../types';
import { generateDebatePDF } from '../../utils/pdfGenerator';
import { BrandHeader } from '../common';
import { loadDebateTeamColors } from '../../utils/debateColors';

interface ScoringScreenProps {
  debate?: Debate;
  onFinish: () => void;
  onBack: () => void;
}

interface EditableScores {
  [key: string]: { score: number };
}

const DEMO_DEBATE = {
  topic: '¿Debe regularse la inteligencia artificial generativa en las aulas?',
  teamAName: 'Atenea Debate Club',
  teamBName: 'Foro Minerva',
};

const demoCriteria = (seed: number): CriterioResult[] => [
  {
    criterio: 'Apertura, cierre y claridad de tesis',
    nota: [4, 3, 4, 2][seed % 4],
    anotacion: 'Presenta una tesis reconocible y mantiene una estructura facil de seguir.',
  },
  {
    criterio: 'Solidez argumental y evidencias',
    nota: [3, 4, 3, 2][seed % 4],
    anotacion: 'Conecta argumentos con ejemplos, aunque alguna evidencia necesita mas precision.',
  },
  {
    criterio: 'Refutacion y escucha activa',
    nota: [4, 2, 3, 3][seed % 4],
    anotacion: 'Responde a la linea contraria y prioriza los choques principales.',
  },
  {
    criterio: 'Comunicacion, liderazgo y lenguaje',
    nota: [3, 4, 4, 3][seed % 4],
    anotacion: 'Buen control de voz, ritmo y presencia escenica.',
  },
  {
    criterio: 'Gestion del tiempo',
    nota: [3, 3, 2, 4][seed % 4],
    anotacion: 'Cierra dentro del margen y reparte bien los bloques.',
  },
];

const DEMO_ANALYSIS_RESULTS: AnalysisResult[] = [
  {
    message: 'Analisis demo',
    fase: 'Introduccion',
    postura: 'A favor',
    orador: 'Lucia Navarro',
    criterios: demoCriteria(0),
    total: 17,
    max_total: 20,
    score_percent: 85,
    debate_type: 'upct',
  },
  {
    message: 'Analisis demo',
    fase: 'Introduccion',
    postura: 'En contra',
    orador: 'Mateo Ruiz',
    criterios: demoCriteria(1),
    total: 16,
    max_total: 20,
    score_percent: 80,
    debate_type: 'upct',
  },
  {
    message: 'Analisis demo',
    fase: 'Primer Refutador',
    postura: 'A favor',
    orador: 'Irene Vidal',
    criterios: demoCriteria(2),
    total: 16,
    max_total: 20,
    score_percent: 80,
    debate_type: 'upct',
  },
  {
    message: 'Analisis demo',
    fase: 'Primer Refutador',
    postura: 'En contra',
    orador: 'Daniel Serra',
    criterios: demoCriteria(3),
    total: 14,
    max_total: 20,
    score_percent: 70,
    debate_type: 'upct',
  },
  {
    message: 'Analisis demo',
    fase: 'Conclusion',
    postura: 'A favor',
    orador: 'Lucia Navarro',
    criterios: demoCriteria(1),
    total: 16,
    max_total: 20,
    score_percent: 80,
    debate_type: 'upct',
  },
  {
    message: 'Analisis demo',
    fase: 'Conclusion',
    postura: 'En contra',
    orador: 'Mateo Ruiz',
    criterios: demoCriteria(2),
    total: 15,
    max_total: 20,
    score_percent: 75,
    debate_type: 'upct',
  },
];

const demoMetrics = (index: number) => ({
  'F0semitoneFrom27.5Hz_sma3nz_stddevNorm': [0.18, 0.14, 0.22, 0.11, 0.2, 0.16][index],
  loudness_sma3_amean: [1.55, 1.28, 1.72, 1.05, 1.48, 1.32][index],
  loudness_sma3_stddevNorm: [0.74, 0.62, 0.86, 0.48, 0.78, 0.58][index],
  loudnessPeaksPerSec: [3.7, 3.1, 4.2, 2.8, 3.9, 3.3][index],
  VoicedSegmentsPerSec: [1.82, 1.55, 2.05, 1.36, 1.76, 1.62][index],
  MeanUnvoicedSegmentLength: [0.11, 0.15, 0.08, 0.19, 0.1, 0.14][index],
  jitterLocal_sma3nz_amean: [0.026, 0.034, 0.021, 0.045, 0.029, 0.038][index],
  shimmerLocaldB_sma3nz_amean: [0.92, 1.15, 0.78, 1.36, 0.98, 1.21][index],
});

const DEMO_SEGMENTS: ProjectSegment[] = DEMO_ANALYSIS_RESULTS.map((result, index) => ({
  segment_id: `demo-segment-${index}`,
  project_code: 'demo-test-debate',
  debate_type: result.debate_type,
  fase_id: result.fase.toLowerCase().replace(/\s+/g, '-'),
  fase_nombre: result.fase,
  postura: result.postura,
  orador: result.orador,
  num_speakers: 1,
  duration_seconds: [178, 164, 192, 151, 132, 146][index],
  analysis: {
    criterios: result.criterios,
    total: result.total,
    max_total: result.max_total,
    score_percent: result.score_percent || 0,
    recommendation: 'Demo: reforzar ejemplos concretos y mantener pausas antes de cada choque argumental.',
  },
  metrics_summary: {
    [result.orador]: demoMetrics(index),
  },
  metrics_raw: {
    [result.orador]: demoMetrics(index),
  },
  transcript_preview: 'Demo de transcripcion: intervencion estructurada con tesis, evidencia, refutacion y cierre.',
  created_at: new Date(2026, 4, 3, 10, index * 7).toISOString(),
}));

const isTestUser = (value?: string | null) => value?.trim().toLowerCase() === 'test';

const getScoreColorClass = (score: number) => {
  if (score >= 4) return 'text-[#3A7D44]';
  if (score >= 3) return 'text-[#3A6EA5]';
  if (score >= 2) return 'text-[#B8872A]';
  return 'text-[#C44536]';
};

const getScoreBadgeClass = (score: number) => {
  if (score >= 4) return 'border-[#3A7D44]/40 bg-[#3A7D44]/12';
  if (score >= 3) return 'border-[#3A6EA5]/40 bg-[#3A6EA5]/12';
  if (score >= 2) return 'border-[#B8872A]/40 bg-[#B8872A]/12';
  return 'border-[#C44536]/40 bg-[#C44536]/12';
};

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getAnalysisPercent = (result: AnalysisResult) =>
  result.score_percent ?? (result.total / Math.max(1, result.max_total)) * 100;

const getResultTeam = (result: AnalysisResult): TeamPosition =>
  result.postura.toLowerCase().includes('contra') ? 'B' : 'A';

const buildCriterionAverages = (results: AnalysisResult[]) => {
  const totals = new Map<string, { total: number; count: number }>();

  results.forEach((result) => {
    result.criterios.forEach((criterion) => {
      const current = totals.get(criterion.criterio) || { total: 0, count: 0 };
      totals.set(criterion.criterio, {
        total: current.total + criterion.nota,
        count: current.count + 1,
      });
    });
  });

  return Array.from(totals.entries())
    .map(([label, value]) => ({
      label,
      avg: value.total / Math.max(1, value.count),
    }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 8);
};

const getSegmentMetrics = (segments: ProjectSegment[]) =>
  segments.flatMap((segment) => {
    const source = segment.metrics_raw && Object.keys(segment.metrics_raw).length > 0
      ? segment.metrics_raw
      : segment.metrics_summary;

    return Object.values(source || {});
  });

const buildProsodyProfile = (segments: ProjectSegment[]) => {
  const metrics = getSegmentMetrics(segments);
  const averageMetric = (keys: string[]) => {
    const values = metrics.flatMap((item) =>
      keys
        .map((key) => item?.[key])
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
    );

    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  return [
    {
      label: 'Expresividad tonal',
      shortLabel: 'Tono',
      value: averageMetric(['F0semitoneFrom27.5Hz_sma3nz_stddevNorm']),
      max: 0.3,
      hint: 'Variación de tono',
      color: '#3A6EA5',
    },
    {
      label: 'Proyección',
      shortLabel: 'Voz',
      value: averageMetric(['loudness_sma3_amean']),
      max: 2,
      hint: 'Volumen percibido',
      color: '#3A7D44',
    },
    {
      label: 'Énfasis',
      shortLabel: 'Énfasis',
      value: averageMetric(['loudness_sma3_stddevNorm', 'loudnessPeaksPerSec']),
      max: 3,
      hint: 'Variación de intensidad',
      color: '#B8872A',
    },
    {
      label: 'Ritmo vocal',
      shortLabel: 'Ritmo',
      value: averageMetric(['VoicedSegmentsPerSec']),
      max: 2.5,
      hint: 'Segmentos vocales/seg',
      color: '#6B5DD3',
    },
    {
      label: 'Pausas',
      shortLabel: 'Pausas',
      value: averageMetric(['MeanUnvoicedSegmentLength']),
      max: 0.25,
      hint: 'Silencios medios',
      color: '#C44536',
    },
    {
      label: 'Estabilidad',
      shortLabel: 'Control',
      value: averageMetric(['jitterLocal_sma3nz_amean', 'shimmerLocaldB_sma3nz_amean']),
      max: 1.6,
      hint: 'Jitter + shimmer',
      color: '#2C2C2C',
    },
  ];
};

const buildDurationProfile = (segments: ProjectSegment[]) =>
  segments
    .filter((segment) => typeof segment.duration_seconds === 'number')
    .map((segment) => ({
      label: segment.fase_nombre,
      team: getResultTeam({
        postura: segment.postura,
        fase: segment.fase_nombre,
        criterios: [],
        total: 0,
        max_total: 1,
        message: '',
        orador: segment.orador,
        debate_type: segment.debate_type,
      }),
      value: segment.duration_seconds || 0,
    }));

const getProsodyReading = (percent: number) => {
  if (percent >= 75) return { label: 'Alto', detail: 'muy presente', className: 'text-[#3A7D44]' };
  if (percent >= 45) return { label: 'Equilibrado', detail: 'zona controlada', className: 'text-[#3A6EA5]' };
  if (percent > 0) return { label: 'Bajo', detail: 'poco marcado', className: 'text-[#B8872A]' };
  return { label: 'Sin dato', detail: 'no medido', className: 'text-[#8A8A8A]' };
};

export const ScoringScreen: React.FC<ScoringScreenProps> = ({ debate, onFinish, onBack }) => {
  const { config, recordings, getAnalysisResults, getTeamScoreFromAnalysis, currentDebateCode, analysisQueue } = useDebateStore();
  const { addDebate } = useDebateHistoryStore();
  const { user } = useAuthStore();
  const isDemoUser = isTestUser(user?.name) || isTestUser(user?.id) || isTestUser(user?.email);
  const resolvedDebateCode = debate?.code || currentDebateCode || '';
  const persistedColors = useMemo(
    () => (resolvedDebateCode ? loadDebateTeamColors(resolvedDebateCode) : null),
    [resolvedDebateCode]
  );
  const teamAColor = persistedColors?.team_a_color || '#3A6EA5';
  const teamBColor = persistedColors?.team_b_color || '#C44536';

  const [scoringResult, setScoringResult] = useState<DebateScoringResult | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableScores, setEditableScores] = useState<EditableScores>({});
  const [expandedRounds, setExpandedRounds] = useState<Record<RubricRoundType, boolean>>({
    introducciones: false,
    refutacion1: false,
    refutacion2: false,
    conclusiones: false,
  });
  const [teamNotes, setTeamNotes] = useState({
    bestSpeakerA: '',
    bestSpeakerB: '',
    teamConnectionA: 0,
    teamConnectionB: 0,
  });
  const [showAnalysisResults, setShowAnalysisResults] = useState(true);
  const [remoteAnalysisResults, setRemoteAnalysisResults] = useState<AnalysisResult[]>([]);
  const [remoteSegments, setRemoteSegments] = useState<ProjectSegment[]>([]);
  const [isLoadingRemoteAnalysis, setIsLoadingRemoteAnalysis] = useState(false);

  useEffect(() => {
    const emptyRoundScores = (teamId: TeamPosition, teamName: string): SpeakerRoundScore[] =>
      DEBATE_RUBRIC.map((section) => ({
        speakerId: `${teamId}-${section.roundType}`,
        speakerName: teamName,
        roundType: section.roundType,
        criterionScores: section.criteria.map((criterion) => ({
          criterionId: criterion.id,
          score: 0,
          notes: '',
        })),
        totalScore: 0,
        notes: '',
      }));

    const initialResult: DebateScoringResult = {
      debateId: `debate-${Date.now()}`,
      date: new Date().toISOString(),
      topic: isDemoUser ? DEMO_DEBATE.topic : config.debateTopic,
      teamAName: isDemoUser ? DEMO_DEBATE.teamAName : config.teamAName,
      teamBName: isDemoUser ? DEMO_DEBATE.teamBName : config.teamBName,
      winner: 'draw',
      teamAScore: {
        teamId: 'A',
        teamName: isDemoUser ? DEMO_DEBATE.teamAName : config.teamAName,
        roundScores: emptyRoundScores('A', isDemoUser ? DEMO_DEBATE.teamAName : config.teamAName),
        teamConnectionScore: 0,
        totalScore: 0,
        bestSpeaker: '',
        overallNotes: '',
      },
      teamBScore: {
        teamId: 'B',
        teamName: isDemoUser ? DEMO_DEBATE.teamBName : config.teamBName,
        roundScores: emptyRoundScores('B', isDemoUser ? DEMO_DEBATE.teamBName : config.teamBName),
        teamConnectionScore: 0,
        totalScore: 0,
        bestSpeaker: '',
        overallNotes: '',
      },
      duration: recordings.reduce((sum, recording) => sum + (recording.duration || 0), 0),
      aiGenerated: false,
      summary: '',
    };

    const initialEditable: EditableScores = {};
    DEBATE_RUBRIC.forEach((section) => {
      section.criteria.forEach((criterion) => {
        initialEditable[`A-${criterion.id}`] = { score: 0 };
        initialEditable[`B-${criterion.id}`] = { score: 0 };
      });
    });

    setEditableScores(initialEditable);
    setScoringResult(initialResult);
  }, [config, isDemoUser, recordings]);

  useEffect(() => {
    if (isDemoUser) {
      setRemoteAnalysisResults(DEMO_ANALYSIS_RESULTS);
      setRemoteSegments(DEMO_SEGMENTS);
      return;
    }
    if (!resolvedDebateCode) return;
    let cancelled = false;

    const hydrateAnalysis = async () => {
      setIsLoadingRemoteAnalysis(true);
      try {
        const response = await debatesService.getDebate(resolvedDebateCode, {
          include_segments: true,
          include_metrics: true,
          include_transcript: false,
          limit: 80,
          offset: 0,
        });
        if (!cancelled) {
          setRemoteAnalysisResults(response.analyses || []);
          setRemoteSegments(response.dashboard?.segments.items || []);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('No se pudieron cargar los analisis del debate finalizado', error);
        }
      } finally {
        if (!cancelled) setIsLoadingRemoteAnalysis(false);
      }
    };

    hydrateAnalysis();
    return () => {
      cancelled = true;
    };
  }, [isDemoUser, resolvedDebateCode]);

  const localAnalysisResults = getAnalysisResults();
  const analysisResults = isDemoUser
    ? DEMO_ANALYSIS_RESULTS
    : localAnalysisResults.length > 0
      ? localAnalysisResults
      : remoteAnalysisResults;
  const scoringSegments = isDemoUser ? DEMO_SEGMENTS : remoteSegments;
  const hasAnyAnalyzedResult = analysisResults.length > 0;
  const formatPendingScore = (value: number) =>
    hasAnyAnalyzedResult || value > 0 || isEditing ? String(value) : 'Analizando...';
  const getTeamScoreFromResults = (team: TeamPosition) => {
    const postureNeedle = team === 'A' ? 'favor' : 'contra';
    const teamResults = analysisResults.filter((result) => result.postura.toLowerCase().includes(postureNeedle));
    if (!teamResults.length) return getTeamScoreFromAnalysis(team);
    const average = teamResults.reduce((sum, result) => sum + result.total, 0) / teamResults.length;
    return Math.round(average);
  };
  const analysisTotalSegments = Math.max(recordings.length, analysisQueue.length, analysisResults.length);
  const analysisCompletedSegments = Math.max(
    analysisResults.length,
    analysisQueue.filter((item) => item.status === 'completed').length
  );
  const analysisPendingSegments = Math.max(0, analysisTotalSegments - analysisCompletedSegments);
  const shouldShowAnalysisProgress =
    analysisTotalSegments > 0 && (analysisPendingSegments > 0 || isLoadingRemoteAnalysis);
  const visualAnalysisResults = useMemo(
    () =>
      analysisResults.map((result, index) => ({
        key: `${result.postura}-${result.fase}-${index}`,
        label: result.fase,
        team: getResultTeam(result),
        percent: getAnalysisPercent(result),
        total: result.total,
        maxTotal: result.max_total,
      })),
    [analysisResults]
  );
  const visualCriteria = useMemo(() => buildCriterionAverages(analysisResults), [analysisResults]);
  const prosodyProfile = useMemo(() => buildProsodyProfile(scoringSegments), [scoringSegments]);
  const durationProfile = useMemo(() => buildDurationProfile(scoringSegments), [scoringSegments]);
  const maxDuration = useMemo(
    () => Math.max(1, ...durationProfile.map((item) => item.value)),
    [durationProfile]
  );
  const teamAAveragePercent = useMemo(() => {
    const results = analysisResults.filter((result) => getResultTeam(result) === 'A');
    if (!results.length) return 0;
    return results.reduce((sum, result) => sum + getAnalysisPercent(result), 0) / results.length;
  }, [analysisResults]);
  const teamBAveragePercent = useMemo(() => {
    const results = analysisResults.filter((result) => getResultTeam(result) === 'B');
    if (!results.length) return 0;
    return results.reduce((sum, result) => sum + getAnalysisPercent(result), 0) / results.length;
  }, [analysisResults]);

  const calculateTeamTotal = (roundScores: SpeakerRoundScore[], connectionScore: number) =>
    roundScores.reduce((sum, round) => sum + round.criterionScores.reduce((cSum, criterion) => cSum + criterion.score, 0), 0) + connectionScore;

  const determineWinner = (teamA: DetailedTeamScore, teamB: DetailedTeamScore): TeamPosition | 'draw' => {
    if (teamA.totalScore > teamB.totalScore) return 'A';
    if (teamB.totalScore > teamA.totalScore) return 'B';
    return 'draw';
  };

  const handleScoreChange = (teamId: TeamPosition, criterionId: string, value: number) => {
    if (!scoringResult) return;
    const key = `${teamId}-${criterionId}`;
    const newScore = Math.min(4, Math.max(0, value));

    setEditableScores((prev) => ({ ...prev, [key]: { score: newScore } }));

    const teamKey = teamId === 'A' ? 'teamAScore' : 'teamBScore';
    const updatedTeam: DetailedTeamScore = {
      ...scoringResult[teamKey],
      roundScores: scoringResult[teamKey].roundScores.map((round) => ({
        ...round,
        criterionScores: round.criterionScores.map((criterion) =>
          criterion.criterionId === criterionId ? { ...criterion, score: newScore } : criterion
        ),
      })),
    };
    updatedTeam.totalScore = calculateTeamTotal(updatedTeam.roundScores, updatedTeam.teamConnectionScore);

    const nextResult: DebateScoringResult = {
      ...scoringResult,
      [teamKey]: updatedTeam,
      winner: determineWinner(
        teamId === 'A' ? updatedTeam : scoringResult.teamAScore,
        teamId === 'B' ? updatedTeam : scoringResult.teamBScore
      ),
    };

    setScoringResult(nextResult);
  };

  const handleConnectionChange = (teamId: TeamPosition, value: number) => {
    if (!scoringResult) return;
    const normalized = Math.min(4, Math.max(0, value));
    const notesKey = teamId === 'A' ? 'teamConnectionA' : 'teamConnectionB';
    setTeamNotes((prev) => ({ ...prev, [notesKey]: normalized }));

    const teamKey = teamId === 'A' ? 'teamAScore' : 'teamBScore';
    const updatedTeam: DetailedTeamScore = {
      ...scoringResult[teamKey],
      teamConnectionScore: normalized,
    };
    updatedTeam.totalScore = calculateTeamTotal(updatedTeam.roundScores, normalized);

    setScoringResult({
      ...scoringResult,
      [teamKey]: updatedTeam,
      winner: determineWinner(
        teamId === 'A' ? updatedTeam : scoringResult.teamAScore,
        teamId === 'B' ? updatedTeam : scoringResult.teamBScore
      ),
    });
  };

  const handleSaveEvaluation = () => {
    if (!scoringResult) return;
    addDebate({
      id: scoringResult.debateId,
      date: scoringResult.date,
      topic: scoringResult.topic,
      teamAName: scoringResult.teamAName,
      teamBName: scoringResult.teamBName,
      winner: scoringResult.winner,
      scores: [
        {
          teamId: 'A',
          teamName: scoringResult.teamAName,
          argumentation: scoringResult.teamAScore.totalScore,
          refutation: scoringResult.teamAScore.totalScore,
          presentation: scoringResult.teamAScore.totalScore,
          total: scoringResult.teamAScore.totalScore,
        },
        {
          teamId: 'B',
          teamName: scoringResult.teamBName,
          argumentation: scoringResult.teamBScore.totalScore,
          refutation: scoringResult.teamBScore.totalScore,
          presentation: scoringResult.teamBScore.totalScore,
          total: scoringResult.teamBScore.totalScore,
        },
      ],
      duration: scoringResult.duration,
      summary: `Ganador: ${
        scoringResult.winner === 'draw'
          ? 'Empate'
          : scoringResult.winner === 'A'
          ? scoringResult.teamAName
          : scoringResult.teamBName
      }`,
      recordingsCount: recordings.length,
    });
    onFinish();
  };

  const handleDownloadPDF = async () => {
    if (!scoringResult) return;
    setIsGeneratingPDF(true);
    try {
      await generateDebatePDF(scoringResult);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const toggleRound = (roundType: RubricRoundType) => {
    setExpandedRounds((prev) => ({ ...prev, [roundType]: !prev[roundType] }));
  };

  if (!scoringResult) {
    return (
      <div className="app-shell flex min-h-screen items-center justify-center pb-32">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-[#2C2C2C]" />
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen overflow-y-auto pb-32">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-8 sm:px-8">
        <BrandHeader className="mb-6" />

        <div className="mb-6 rounded-[20px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="w-32">
              <button
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-[#1C1D1F] bg-[#F5F5F3] px-4 py-2 text-[#2C2C2C] transition-opacity hover:opacity-80"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Volver</span>
              </button>
            </div>
            <h1 className="text-center text-[34px] leading-none text-[#2C2C2C] sm:text-[42px]">Evaluacion Final</h1>
            <div className="w-32 flex justify-end">
              <button
                onClick={() => setIsEditing((prev) => !prev)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[#2C2C2C] ${
                  isEditing ? 'border-[#3A7D44] bg-[#3A7D44]/20' : 'border-[#1C1D1F] bg-[#F5F5F3]'
                }`}
              >
                {isEditing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                <span className="hidden sm:inline">{isEditing ? 'Guardar' : 'Editar'}</span>
              </button>
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-[20px] border-[3px] border-[#1C1D1F] bg-[#ECECE9] px-5 py-6">
          <h2 className="mb-4 text-center text-[30px] leading-none text-[#2C2C2C] sm:text-[36px]">
            {isDemoUser ? DEMO_DEBATE.topic : debate?.debate_topic || scoringResult.topic}
          </h2>

          {analysisResults.length > 0 && (
            <div className="mb-5 flex justify-center gap-2">
              <button
                onClick={() => setShowAnalysisResults(true)}
                className={`rounded-xl border px-4 py-2 ${showAnalysisResults ? 'border-[#1C1D1F] bg-[#F5F5F3] text-[#2C2C2C]' : 'border-[#CFCFCD] bg-white text-[#6A6A6A]'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Analisis Automatico ({analysisResults.length})
                </span>
              </button>
              <button
                onClick={() => setShowAnalysisResults(false)}
                className={`rounded-xl border px-4 py-2 ${!showAnalysisResults ? 'border-[#1C1D1F] bg-[#F5F5F3] text-[#2C2C2C]' : 'border-[#CFCFCD] bg-white text-[#6A6A6A]'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <Edit3 className="h-4 w-4" />
                  Evaluacion Manual
                </span>
              </button>
            </div>
          )}

          {shouldShowAnalysisProgress && (
            <div className="mb-5 rounded-xl border border-[#E6C068]/60 bg-[#E6C068]/20 px-4 py-3 text-[#2C2C2C]">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {analysisCompletedSegments > 0
                    ? `Analizando intervenciones... ${analysisCompletedSegments}/${analysisTotalSegments} completadas`
                    : 'Analizando intervenciones...'}
                </span>
              </div>
            </div>
          )}

          {showAnalysisResults && analysisResults.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`rounded-xl border-2 p-4 ${getTeamScoreFromResults('A') <= getTeamScoreFromResults('B') ? 'border-[#CFCFCD] bg-white' : ''}`}
                  style={
                    getTeamScoreFromResults('A') > getTeamScoreFromResults('B')
                      ? { borderColor: hexToRgba(teamAColor, 0.6), background: hexToRgba(teamAColor, 0.12) }
                      : undefined
                  }
                >
                  <p className="text-sm font-medium" style={{ color: teamAColor }}>{scoringResult.teamAName}</p>
                  <p className="text-3xl font-bold text-[#2C2C2C]">{formatPendingScore(getTeamScoreFromResults('A'))}</p>
                </div>
                <div
                  className={`rounded-xl border-2 p-4 ${getTeamScoreFromResults('B') <= getTeamScoreFromResults('A') ? 'border-[#CFCFCD] bg-white' : ''}`}
                  style={
                    getTeamScoreFromResults('B') > getTeamScoreFromResults('A')
                      ? { borderColor: hexToRgba(teamBColor, 0.7), background: hexToRgba(teamBColor, 0.12) }
                      : undefined
                  }
                >
                  <p className="text-sm font-medium" style={{ color: teamBColor }}>{scoringResult.teamBName}</p>
                  <p className="text-3xl font-bold text-[#2C2C2C]">{formatPendingScore(getTeamScoreFromResults('B'))}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-xl border border-[#CFCFCD] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5E5E5E]">Grafica</p>
                      <h3 className="text-xl font-bold text-[#2C2C2C]">Rendimiento por intervencion</h3>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-[#5E5E5E]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: teamAColor }} />
                        {scoringResult.teamAName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[#5E5E5E]">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: teamBColor }} />
                        {scoringResult.teamBName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {visualAnalysisResults.map((item) => {
                      const color = item.team === 'A' ? teamAColor : teamBColor;
                      return (
                        <div key={item.key} className="grid grid-cols-[minmax(88px,150px)_1fr_62px] items-center gap-3">
                          <p className="truncate text-sm font-medium text-[#5E5E5E]">{item.label}</p>
                          <div className="h-4 overflow-hidden rounded-full bg-[#E4E4E0]">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, Math.max(0, item.percent))}%`,
                                background: color,
                              }}
                            />
                          </div>
                          <p className="text-right text-sm font-bold text-[#2C2C2C]">{item.total}/{item.maxTotal}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#CFCFCD] bg-white p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5E5E5E]">Visual</p>
                      <h3 className="text-xl font-bold text-[#2C2C2C]">Comparativa y rubrica</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: scoringResult.teamAName, value: teamAAveragePercent, color: teamAColor },
                        { label: scoringResult.teamBName, value: teamBAveragePercent, color: teamBColor },
                      ].map((team) => (
                        <div key={`gauge-${team.label}`} className="text-center">
                          <svg viewBox="0 0 64 64" className="mx-auto h-14 w-14">
                            <circle cx="32" cy="32" r="24" fill="none" stroke="#E4E4E0" strokeWidth="8" />
                            <circle
                              cx="32"
                              cy="32"
                              r="24"
                              fill="none"
                              stroke={team.color}
                              strokeWidth="8"
                              strokeLinecap="round"
                              strokeDasharray={`${Math.min(100, Math.max(0, team.value)) * 1.51} 151`}
                              transform="rotate(-90 32 32)"
                            />
                          </svg>
                          <p className="max-w-24 truncate text-xs font-semibold" style={{ color: team.color }}>{team.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {visualCriteria.map((criterion, index) => (
                      <div key={`visual-criterion-${criterion.label}`} className="rounded-lg bg-[#F5F5F3] px-3 py-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="truncate text-sm text-[#5E5E5E]">{criterion.label}</p>
                          <p className={getScoreColorClass(criterion.avg)}>{criterion.avg.toFixed(1)}</p>
                        </div>
                        <div className="h-2 rounded-full bg-white">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, Math.max(0, criterion.avg * 25))}%`,
                              background: index < 3 ? '#B8872A' : '#3A6EA5',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-xl border border-[#CFCFCD] bg-white p-4">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-[#5E5E5E]">Prosodica</p>
                      <h3 className="text-xl font-bold text-[#2C2C2C]">Como sono el debate</h3>
                      <p className="mt-1 text-sm text-[#5E5E5E]">
                        Lectura de voz a partir de metricas acusticas: tono, volumen, ritmo, pausas y estabilidad.
                      </p>
                    </div>
                    <span className="rounded-full bg-[#F5F5F3] px-3 py-1 text-xs text-[#5E5E5E]">
                      {isDemoUser
                        ? 'Demo test: datos inventados'
                        : scoringSegments.length
                          ? `${scoringSegments.length} segmentos del backend`
                          : 'Esperando metricas'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {prosodyProfile.map((metric) => {
                      const percent =
                        typeof metric.value === 'number'
                          ? Math.min(100, Math.max(0, (metric.value / metric.max) * 100))
                          : 0;
                      const reading = getProsodyReading(percent);

                      return (
                        <div
                          key={`prosody-${metric.label}`}
                          className="rounded-xl border border-[#CFCFCD] bg-[#F5F5F3] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[#2C2C2C]">{metric.shortLabel}</p>
                            <p className="text-xs text-[#5E5E5E]">
                              {typeof metric.value === 'number' ? metric.value.toFixed(2) : 'N/A'}
                            </p>
                          </div>
                          <svg viewBox="0 0 88 88" className="mx-auto h-20 w-20">
                            <circle cx="44" cy="44" r="34" fill="none" stroke="#FFFFFF" strokeWidth="10" />
                            <circle
                              cx="44"
                              cy="44"
                              r="34"
                              fill="none"
                              stroke={metric.color}
                              strokeWidth="10"
                              strokeLinecap="round"
                              strokeDasharray={`${percent * 2.14} 214`}
                              transform="rotate(-90 44 44)"
                            />
                            <text x="44" y="48" textAnchor="middle" className="fill-[#2C2C2C] text-[15px] font-bold">
                              {Math.round(percent)}
                            </text>
                          </svg>
                          <p className={`mt-1 text-center text-sm font-bold ${reading.className}`}>{reading.label}</p>
                          <p className="text-center text-xs text-[#5E5E5E]">{metric.hint} · {reading.detail}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-[#CFCFCD] bg-white p-4">
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[#5E5E5E]">Backend</p>
                    <h3 className="text-xl font-bold text-[#2C2C2C]">Tiempo y presencia</h3>
                  </div>

                  {durationProfile.length > 0 ? (
                    <div className="space-y-3">
                      {durationProfile.slice(0, 8).map((item, index) => {
                        const color = item.team === 'A' ? teamAColor : teamBColor;
                        return (
                          <div key={`duration-${item.label}-${index}`} className="grid grid-cols-[minmax(82px,140px)_1fr_56px] items-center gap-3">
                            <p className="truncate text-sm font-medium text-[#5E5E5E]">{item.label}</p>
                            <div className="h-3 overflow-hidden rounded-full bg-[#E4E4E0]">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(100, Math.max(4, (item.value / maxDuration) * 100))}%`,
                                  background: color,
                                }}
                              />
                            </div>
                            <p className="text-right text-sm font-bold text-[#2C2C2C]">{Math.round(item.value)}s</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#F5F5F3] p-4 text-sm text-[#5E5E5E]">
                      No hay duraciones o metricas de segmentos para este debate. Cuando el backend devuelva `segments` con `metrics_summary`, este bloque se rellena automaticamente.
                    </div>
                  )}
                </div>
              </div>

              {analysisResults.map((result, index) => (
                <div key={`analysis-${index}`} className="rounded-xl border border-[#CFCFCD] bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-sm text-[#5E5E5E]">
                      <span className="font-semibold" style={{ color: result.postura === 'A Favor' ? teamAColor : teamBColor }}>
                        {result.postura === 'A Favor' ? scoringResult.teamAName : scoringResult.teamBName}
                      </span>{' '}
                      • {result.fase}
                    </div>
                    <div className="text-sm text-[#5E5E5E]">
                      <span className="text-xl font-bold text-[#2C2C2C]">{result.total}</span> / {result.max_total}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {result.criterios.map((criterion: CriterioResult, cIndex: number) => (
                      <div key={`criterion-${index}-${cIndex}`} className="flex items-center justify-between rounded bg-[#F5F5F3] px-2 py-1 text-sm">
                        <span className="mr-2 truncate text-[#5E5E5E]">{criterion.criterio}</span>
                        <span className={getScoreColorClass(criterion.nota)}>{criterion.nota}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {analysisPendingSegments > 0 &&
                Array.from({ length: Math.min(analysisPendingSegments, 4) }).map((_, index) => (
                  <div
                    key={`analysis-pending-${index}`}
                    className="rounded-xl border border-[#CFCFCD] bg-white p-3 text-[#5E5E5E]"
                  >
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando intervención...
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div
                className={`rounded-xl border-2 p-4 ${scoringResult.winner !== 'A' ? 'border-[#CFCFCD] bg-white' : ''}`}
                style={
                  scoringResult.winner === 'A'
                    ? { borderColor: hexToRgba(teamAColor, 0.6), background: hexToRgba(teamAColor, 0.12) }
                    : undefined
                }
              >
                <p className="text-sm font-medium" style={{ color: teamAColor }}>{scoringResult.teamAName}</p>
                <p className="text-3xl font-bold text-[#2C2C2C]">{formatPendingScore(scoringResult.teamAScore.totalScore)}</p>
              </div>
              <div
                className={`rounded-xl border-2 p-4 ${scoringResult.winner !== 'B' ? 'border-[#CFCFCD] bg-white' : ''}`}
                style={
                  scoringResult.winner === 'B'
                    ? { borderColor: hexToRgba(teamBColor, 0.7), background: hexToRgba(teamBColor, 0.12) }
                    : undefined
                }
              >
                <p className="text-sm font-medium" style={{ color: teamBColor }}>{scoringResult.teamBName}</p>
                <p className="text-3xl font-bold text-[#2C2C2C]">{formatPendingScore(scoringResult.teamBScore.totalScore)}</p>
              </div>
            </div>
          )}
        </section>

        {(!showAnalysisResults || analysisResults.length === 0) && (
          <section className="mb-6 space-y-4">
            {DEBATE_RUBRIC.map((section) => (
              <div key={section.roundType} className="overflow-hidden rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9]">
                <button
                  onClick={() => toggleRound(section.roundType)}
                  className="flex w-full items-center justify-between p-4 transition-colors hover:bg-[#F5F5F3]"
                >
                  <div className="flex items-center gap-3">
                    <Mic className="h-5 w-5 text-[#5E5E5E]" />
                    <span className="font-semibold text-[#2C2C2C]">{section.roundName}</span>
                  </div>
                  {expandedRounds[section.roundType] ? <ChevronUp className="h-5 w-5 text-[#5E5E5E]" /> : <ChevronDown className="h-5 w-5 text-[#5E5E5E]" />}
                </button>

                {expandedRounds[section.roundType] && (
                  <div className="border-t border-[#CFCFCD] p-4">
                    <div className="mb-4 grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <span className="font-semibold" style={{ color: teamAColor }}>{scoringResult.teamAName}</span>
                      </div>
                      <div className="text-center text-sm text-[#8A8A8A]">Rubrica</div>
                      <div className="text-center">
                        <span className="font-semibold" style={{ color: teamBColor }}>{scoringResult.teamBName}</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {section.criteria.map((criterion) => {
                        const keyA = `A-${criterion.id}`;
                        const keyB = `B-${criterion.id}`;
                        const scoreA = editableScores[keyA]?.score || 0;
                        const scoreB = editableScores[keyB]?.score || 0;
                        return (
                          <div key={criterion.id} className="grid grid-cols-3 items-center gap-4 rounded-lg bg-[#F5F5F3] p-3">
                            <div className="flex justify-center">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={4}
                                    value={scoreA}
                                    onChange={(e) => handleScoreChange('A', criterion.id, parseInt(e.target.value, 10) || 0)}
                                    className="w-16 rounded border border-[#CFCFCD] bg-white px-2 py-1 text-center text-[#2C2C2C]"
                                  />
                                  <span className="text-sm text-[#8A8A8A]">/ {criterion.maxScore}</span>
                                </div>
                              ) : (
                                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${getScoreBadgeClass(scoreA)}`}>
                                  <span className={`font-bold ${getScoreColorClass(scoreA)}`}>
                                    {hasAnyAnalyzedResult || scoreA > 0 ? scoreA : '—'}
                                  </span>
                                  <span className="text-sm text-[#8A8A8A]">/ {criterion.maxScore}</span>
                                </div>
                              )}
                            </div>

                            <div className="text-center text-sm text-[#5E5E5E]">{criterion.description}</div>

                            <div className="flex justify-center">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={4}
                                    value={scoreB}
                                    onChange={(e) => handleScoreChange('B', criterion.id, parseInt(e.target.value, 10) || 0)}
                                    className="w-16 rounded border border-[#CFCFCD] bg-white px-2 py-1 text-center text-[#2C2C2C]"
                                  />
                                  <span className="text-sm text-[#8A8A8A]">/ {criterion.maxScore}</span>
                                </div>
                              ) : (
                                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${getScoreBadgeClass(scoreB)}`}>
                                  <span className={`font-bold ${getScoreColorClass(scoreB)}`}>
                                    {hasAnyAnalyzedResult || scoreB > 0 ? scoreB : '—'}
                                  </span>
                                  <span className="text-sm text-[#8A8A8A]">/ {criterion.maxScore}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        <section className="mb-6 rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-6">
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#2C2C2C]">
            <Trophy className="h-6 w-6 text-[#B8872A]" />
            Sumatorio y Evaluacion Global
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { team: 'A' as TeamPosition, name: scoringResult.teamAName, color: teamAColor, connection: teamNotes.teamConnectionA, bestSpeaker: teamNotes.bestSpeakerA },
              { team: 'B' as TeamPosition, name: scoringResult.teamBName, color: teamBColor, connection: teamNotes.teamConnectionB, bestSpeaker: teamNotes.bestSpeakerB },
            ].map(({ team, name, color, connection, bestSpeaker }) => (
              <div key={`summary-${team}`} className="space-y-3 rounded-xl border border-[#CFCFCD] bg-white p-4">
                <h4 className="font-semibold" style={{ color }}>{name}</h4>
                <div>
                  <label className="mb-2 block text-sm text-[#5E5E5E]">Conexion entre miembros (0-4)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={4}
                      value={connection}
                      onChange={(e) => handleConnectionChange(team, parseInt(e.target.value, 10) || 0)}
                      className="w-full rounded-lg border border-[#CFCFCD] bg-white px-3 py-2 text-[#2C2C2C]"
                    />
                  ) : (
                    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${getScoreBadgeClass(connection)}`}>
                      <span className={getScoreColorClass(connection)}>
                        {hasAnyAnalyzedResult || connection > 0 ? connection : '—'}
                      </span>
                      <span className="text-[#8A8A8A]">/4</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm text-[#5E5E5E]">Mejor orador</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={bestSpeaker}
                      onChange={(e) =>
                        setTeamNotes((prev) => ({
                          ...prev,
                          [team === 'A' ? 'bestSpeakerA' : 'bestSpeakerB']: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-[#CFCFCD] bg-white px-3 py-2 text-[#2C2C2C]"
                      placeholder="Orador destacado"
                    />
                  ) : (
                    <p className="text-[#2C2C2C]">{bestSpeaker || 'No especificado'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-32 rounded-2xl border-[3px] border-[#1C1D1F] bg-[#ECECE9] p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1C1D1F] bg-[#F5F5F3] px-6 py-3 font-semibold text-[#2C2C2C] transition-opacity hover:opacity-80 disabled:opacity-50 sm:flex-none"
            >
              {isGeneratingPDF ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              <span>Descargar PDF</span>
            </button>

            <button
              onClick={handleSaveEvaluation}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#3A7D44] bg-[#3A7D44] px-6 py-3 font-semibold text-[#F5F5F3] transition-opacity hover:opacity-90"
            >
              <CheckCircle2 className="h-5 w-5" />
              <span>Guardar Evaluacion</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ScoringScreen;
