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
import {
  DEBATE_RUBRIC,
  DebateScoringResult,
  DetailedTeamScore,
  RubricRoundType,
  SpeakerRoundScore,
  TeamPosition,
} from '../../types';
import { generateDebatePDF } from '../../utils/pdfGenerator';
import { BrandHeader } from '../common';
import { loadDebateTeamColors } from '../../utils/debateColors';

interface ScoringScreenProps {
  onFinish: () => void;
  onBack: () => void;
}

interface EditableScores {
  [key: string]: { score: number };
}

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

export const ScoringScreen: React.FC<ScoringScreenProps> = ({ onFinish, onBack }) => {
  const { config, recordings, getAnalysisResults, getTeamScoreFromAnalysis, currentDebateCode } = useDebateStore();
  const { addDebate } = useDebateHistoryStore();
  const analysisResults = getAnalysisResults();
  const persistedColors = useMemo(
    () => (currentDebateCode ? loadDebateTeamColors(currentDebateCode) : null),
    [currentDebateCode]
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
      topic: config.debateTopic,
      teamAName: config.teamAName,
      teamBName: config.teamBName,
      winner: 'draw',
      teamAScore: {
        teamId: 'A',
        teamName: config.teamAName,
        roundScores: emptyRoundScores('A', config.teamAName),
        teamConnectionScore: 0,
        totalScore: 0,
        bestSpeaker: '',
        overallNotes: '',
      },
      teamBScore: {
        teamId: 'B',
        teamName: config.teamBName,
        roundScores: emptyRoundScores('B', config.teamBName),
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
  }, [config, recordings]);

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
          <h2 className="mb-4 text-center text-[30px] leading-none text-[#2C2C2C] sm:text-[36px]">{scoringResult.topic}</h2>

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

          {showAnalysisResults && analysisResults.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`rounded-xl border-2 p-4 ${getTeamScoreFromAnalysis('A') <= getTeamScoreFromAnalysis('B') ? 'border-[#CFCFCD] bg-white' : ''}`}
                  style={
                    getTeamScoreFromAnalysis('A') > getTeamScoreFromAnalysis('B')
                      ? { borderColor: hexToRgba(teamAColor, 0.6), background: hexToRgba(teamAColor, 0.12) }
                      : undefined
                  }
                >
                  <p className="text-sm font-medium" style={{ color: teamAColor }}>{scoringResult.teamAName}</p>
                  <p className="text-3xl font-bold text-[#2C2C2C]">{getTeamScoreFromAnalysis('A')}</p>
                </div>
                <div
                  className={`rounded-xl border-2 p-4 ${getTeamScoreFromAnalysis('B') <= getTeamScoreFromAnalysis('A') ? 'border-[#CFCFCD] bg-white' : ''}`}
                  style={
                    getTeamScoreFromAnalysis('B') > getTeamScoreFromAnalysis('A')
                      ? { borderColor: hexToRgba(teamBColor, 0.7), background: hexToRgba(teamBColor, 0.12) }
                      : undefined
                  }
                >
                  <p className="text-sm font-medium" style={{ color: teamBColor }}>{scoringResult.teamBName}</p>
                  <p className="text-3xl font-bold text-[#2C2C2C]">{getTeamScoreFromAnalysis('B')}</p>
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
                    {result.criterios.map((criterion, cIndex) => (
                      <div key={`criterion-${index}-${cIndex}`} className="flex items-center justify-between rounded bg-[#F5F5F3] px-2 py-1 text-sm">
                        <span className="mr-2 truncate text-[#5E5E5E]">{criterion.criterio}</span>
                        <span className={getScoreColorClass(criterion.nota)}>{criterion.nota}</span>
                      </div>
                    ))}
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
                <p className="text-3xl font-bold text-[#2C2C2C]">{scoringResult.teamAScore.totalScore}</p>
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
                <p className="text-3xl font-bold text-[#2C2C2C]">{scoringResult.teamBScore.totalScore}</p>
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
                                  <span className={`font-bold ${getScoreColorClass(scoreA)}`}>{scoreA}</span>
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
                                  <span className={`font-bold ${getScoreColorClass(scoreB)}`}>{scoreB}</span>
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
                      <span className={getScoreColorClass(connection)}>{connection}</span>
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
                      placeholder="Nombre del mejor orador"
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
