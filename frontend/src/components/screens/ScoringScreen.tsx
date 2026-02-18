/**
 * ScoringScreen - Pantalla de puntuación y evaluación del debate
 * Muestra la rúbrica completa por rondas y permite evaluar ambos equipos
 */

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Download, 
  Trophy, 
  Loader2, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  Mic
} from 'lucide-react';
import { useDebateStore } from '../../store/debateStore';
import { useDebateHistoryStore } from '../../store/debateHistoryStore';
import { 
  DEBATE_RUBRIC, 
  DetailedTeamScore, 
  DebateScoringResult,
  TeamPosition,
  SpeakerRoundScore,
  RubricRoundType
} from '../../types';
import { generateDebatePDF } from '../../utils/pdfGenerator';

interface ScoringScreenProps {
  onFinish: () => void;
  onBack: () => void;
}

interface EditableScores {
  [key: string]: { score: number };
}

const getScoreColor = (score: number) => {
  if (score >= 4) return 'text-green-400';
  if (score >= 3) return 'text-[#00E5FF]';
  if (score >= 2) return 'text-yellow-400';
  return 'text-[#FF6B00]';
};

const getScoreBgColor = (score: number) => {
  if (score >= 4) return 'bg-green-500/20 border-green-500/30';
  if (score >= 3) return 'bg-[#00E5FF]/20 border-[#00E5FF]/30';
  if (score >= 2) return 'bg-yellow-500/20 border-yellow-500/30';
  return 'bg-[#FF6B00]/20 border-[#FF6B00]/30';
};

export const ScoringScreen: React.FC<ScoringScreenProps> = ({ onFinish, onBack }) => {
  const { config, recordings } = useDebateStore();
  const { addDebate } = useDebateHistoryStore();
  
  const [scoringResult, setScoringResult] = useState<DebateScoringResult | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editableScores, setEditableScores] = useState<EditableScores>({});
  const [expandedRounds, setExpandedRounds] = useState<Record<RubricRoundType, boolean>>({
    introducciones: false,
    refutacion1: false,
    refutacion2: false,
    conclusiones: false
  });
  const [teamNotes, setTeamNotes] = useState({
    bestSpeakerA: '',
    bestSpeakerB: '',
    teamConnectionA: 0,
    teamConnectionB: 0
  });

  useEffect(() => {
    initializeEmptyScoring();
  }, []);

  const initializeEmptyScoring = () => {
    const emptyRoundScores = (teamId: TeamPosition, teamName: string): SpeakerRoundScore[] => {
      return DEBATE_RUBRIC.map(section => ({
        speakerId: `${teamId}-${section.roundType}`,
        speakerName: teamName,
        roundType: section.roundType,
        criterionScores: section.criteria.map(c => ({
          criterionId: c.id,
          score: 0,
          notes: ''
        })),
        totalScore: 0,
        notes: ''
      }));
    };

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
        overallNotes: ''
      },
      teamBScore: {
        teamId: 'B',
        teamName: config.teamBName,
        roundScores: emptyRoundScores('B', config.teamBName),
        teamConnectionScore: 0,
        totalScore: 0,
        bestSpeaker: '',
        overallNotes: ''
      },
      duration: recordings.reduce((sum, r) => sum + (r.duration || 0), 0),
      aiGenerated: false,
      summary: ''
    };

    setScoringResult(initialResult);
    
    const initialEditable: EditableScores = {};
    DEBATE_RUBRIC.forEach(section => {
      section.criteria.forEach(criterion => {
        initialEditable[`A-${criterion.id}`] = { score: 0 };
        initialEditable[`B-${criterion.id}`] = { score: 0 };
      });
    });
    setEditableScores(initialEditable);
  };

  const handleScoreChange = (teamId: TeamPosition, criterionId: string, value: number) => {
    const key = `${teamId}-${criterionId}`;
    const newScore = Math.min(4, Math.max(0, value));
    
    setEditableScores(prev => ({ ...prev, [key]: { score: newScore } }));
    
    if (scoringResult) {
      const teamKey = teamId === 'A' ? 'teamAScore' : 'teamBScore';
      const updatedTeam = { ...scoringResult[teamKey] };
      
      updatedTeam.roundScores = updatedTeam.roundScores.map(round => ({
        ...round,
        criterionScores: round.criterionScores.map(c => 
          c.criterionId === criterionId ? { ...c, score: newScore } : c
        )
      }));
      
      updatedTeam.totalScore = calculateTeamTotal(updatedTeam.roundScores, updatedTeam.teamConnectionScore);
      
      setScoringResult({
        ...scoringResult,
        [teamKey]: updatedTeam,
        winner: determineWinner(
          teamId === 'A' ? updatedTeam : scoringResult.teamAScore,
          teamId === 'B' ? updatedTeam : scoringResult.teamBScore
        )
      });
    }
  };

  const calculateTeamTotal = (roundScores: SpeakerRoundScore[], connectionScore: number): number => {
    const roundsTotal = roundScores.reduce((sum, round) => 
      sum + round.criterionScores.reduce((cSum, c) => cSum + c.score, 0), 0
    );
    return roundsTotal + connectionScore;
  };

  const determineWinner = (teamA: DetailedTeamScore, teamB: DetailedTeamScore): TeamPosition | 'draw' => {
    if (teamA.totalScore > teamB.totalScore) return 'A';
    if (teamB.totalScore > teamA.totalScore) return 'B';
    return 'draw';
  };

  const toggleRound = (roundType: RubricRoundType) => {
    setExpandedRounds(prev => ({ ...prev, [roundType]: !prev[roundType] }));
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
          total: scoringResult.teamAScore.totalScore
        },
        {
          teamId: 'B',
          teamName: scoringResult.teamBName,
          argumentation: scoringResult.teamBScore.totalScore,
          refutation: scoringResult.teamBScore.totalScore,
          presentation: scoringResult.teamBScore.totalScore,
          total: scoringResult.teamBScore.totalScore
        }
      ],
      duration: scoringResult.duration,
      summary: `Ganador: ${scoringResult.winner === 'draw' ? 'Empate' : scoringResult.winner === 'A' ? scoringResult.teamAName : scoringResult.teamBName}`,
      recordingsCount: recordings.length
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

  if (!scoringResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center pb-32">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00E5FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-y-auto pb-32">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back button */}
            <div className="w-32">
              <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white/90 rounded-lg hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]">
                <ArrowLeft className="w-5 h-5" />
                <span>Volver</span>
              </button>
            </div>

            {/* Center: Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10">
                <img src="/logo.svg" alt="CiceronAI" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-white">CiceronAI</span>
            </div>

            {/* Right: Edit button */}
            <div className="w-32 flex justify-end">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isEditing ? 'bg-green-600/20 text-green-400 border border-green-500/30' : 'bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)]'
                }`}
              >
                {isEditing ? <><Save className="w-4 h-4" /><span className="hidden sm:inline">Guardar</span></> : <><Edit3 className="w-4 h-4" /><span className="hidden sm:inline">Editar</span></>}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">{scoringResult.topic}</h1>
            
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className={`p-4 rounded-xl border-2 ${scoringResult.winner === 'A' ? 'border-[#FF6B00]/50 bg-[#FF6B00]/10' : 'border-slate-700'}`}>
                <p className="text-[#FF6B00] text-sm font-medium mb-1">{scoringResult.teamAName}</p>
                <p className="text-3xl font-bold text-white">{scoringResult.teamAScore.totalScore}</p>
              </div>
              
              <div className={`p-4 rounded-xl border-2 ${scoringResult.winner === 'B' ? 'border-[#00E5FF]/50 bg-[#00E5FF]/10' : 'border-slate-700'}`}>
                <p className="text-[#00E5FF] text-sm font-medium mb-1">{scoringResult.teamBName}</p>
                <p className="text-3xl font-bold text-white">{scoringResult.teamBScore.totalScore}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {DEBATE_RUBRIC.map((section) => (
              <div key={section.roundType} className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <button
                  onClick={() => toggleRound(section.roundType)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-5 h-5 text-slate-400" />
                    <span className="text-white font-semibold">{section.roundName}</span>
                  </div>
                  {expandedRounds[section.roundType] ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>

                {expandedRounds[section.roundType] && (
                  <div className="border-t border-slate-700">
                    <div className="p-4">
                      {/* Headers de equipos */}
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <span className="text-[#FF6B00] font-semibold">{scoringResult.teamAName}</span>
                          <span className="text-slate-500 ml-2">(A Favor)</span>
                        </div>
                        <div className="text-center">
                          <span className="text-slate-400 text-sm">Rúbrica</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[#00E5FF] font-semibold">{scoringResult.teamBName}</span>
                          <span className="text-slate-500 ml-2">(En Contra)</span>
                        </div>
                      </div>
                      
                      {/* Criterios con puntuaciones a los lados */}
                      <div className="space-y-3">
                        {section.criteria.map((criterion) => {
                          const keyA = `A-${criterion.id}`;
                          const keyB = `B-${criterion.id}`;
                          const scoreA = editableScores[keyA]?.score || 0;
                          const scoreB = editableScores[keyB]?.score || 0;
                          
                          return (
                            <div key={criterion.id} className="grid grid-cols-3 gap-4 items-center bg-slate-900/50 rounded-lg p-3">
                              {/* Puntuación Equipo A */}
                              <div className="flex justify-center">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={scoreA}
                                      onChange={(e) => handleScoreChange('A', criterion.id, parseInt(e.target.value) || 0)}
                                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center"
                                    />
                                    <span className="text-slate-500 text-sm">/ {criterion.maxScore}</span>
                                  </div>
                                ) : (
                                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getScoreBgColor(scoreA)}`}>
                                    <span className={`font-bold ${getScoreColor(scoreA)}`}>{scoreA}</span>
                                    <span className="text-slate-400 text-sm">/ {criterion.maxScore}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Descripción de la rúbrica (centro) */}
                              <div className="text-center">
                                <p className="text-slate-300 text-sm">{criterion.description}</p>
                              </div>
                              
                              {/* Puntuación Equipo B */}
                              <div className="flex justify-center">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="4"
                                      value={scoreB}
                                      onChange={(e) => handleScoreChange('B', criterion.id, parseInt(e.target.value) || 0)}
                                      className="w-16 px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-center"
                                    />
                                    <span className="text-slate-500 text-sm">/ {criterion.maxScore}</span>
                                  </div>
                                ) : (
                                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getScoreBgColor(scoreB)}`}>
                                    <span className={`font-bold ${getScoreColor(scoreB)}`}>{scoreB}</span>
                                    <span className="text-slate-400 text-sm">/ {criterion.maxScore}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              Sumatorio y Evaluación Global
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { team: 'A', name: scoringResult.teamAName, color: 'text-[#FF6B00]', connection: teamNotes.teamConnectionA, bestSpeaker: teamNotes.bestSpeakerA },
                { team: 'B', name: scoringResult.teamBName, color: 'text-[#00E5FF]', connection: teamNotes.teamConnectionB, bestSpeaker: teamNotes.bestSpeakerB }
              ].map(({ team, name, color, connection, bestSpeaker }) => (
                <div key={team} className="space-y-4">
                  <h3 className={`${color} font-semibold`}>{name}</h3>
                  
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Conexión entre miembros (0-4)</label>
                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        max="4"
                        value={connection}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          setTeamNotes(prev => ({ ...prev, [`teamConnection${team}`]: value }));
                          if (scoringResult) {
                            const teamKey = team === 'A' ? 'teamAScore' : 'teamBScore';
                            const updatedTeam = { ...scoringResult[teamKey], teamConnectionScore: value };
                            updatedTeam.totalScore = calculateTeamTotal(updatedTeam.roundScores, value);
                            setScoringResult({
                              ...scoringResult,
                              [teamKey]: updatedTeam,
                              winner: determineWinner(
                                team === 'A' ? updatedTeam : scoringResult.teamAScore,
                                team === 'B' ? updatedTeam : scoringResult.teamBScore
                              )
                            });
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      />
                    ) : (
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getScoreBgColor(connection)}`}>
                        <span className={`font-bold ${getScoreColor(connection)}`}>{connection}</span>
                        <span className="text-slate-400">/ 4</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-slate-400 text-sm mb-2">Mejor Orador</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={bestSpeaker}
                        onChange={(e) => setTeamNotes(prev => ({ ...prev, [`bestSpeaker${team}`]: e.target.value }))}
                        placeholder="Nombre del mejor orador"
                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white"
                      />
                    ) : (
                      <p className="text-white">{bestSpeaker || 'No especificado'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones de acción - debajo de Sumatorio y Evaluación Global */}
          <div className="mt-6 mb-32 bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40 text-white rounded-xl font-semibold hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50 transition-all border border-white/20 shadow-[0_8px_32px_rgba(31,42,51,0.4)] disabled:opacity-50"
              >
                {isGeneratingPDF ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                <span>Descargar PDF</span>
              </button>
              
              <button
                onClick={handleSaveEvaluation}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-br from-green-600/20 to-green-600/10 text-green-400 rounded-xl font-semibold hover:from-green-600/30 hover:to-green-600/20 transition-all border border-green-500/30 shadow-[0_8px_32px_rgba(34,197,94,0.2)]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Guardar Evaluación</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
