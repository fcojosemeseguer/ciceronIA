/**
 * PDF Generator - Genera PDF con la rúbrica y puntuaciones del debate
 * Actualizado para la nueva estructura de rúbrica por rondas
 */

import jsPDF from 'jspdf';
import { DebateScoringResult, DEBATE_RUBRIC } from '../types';

export const generateDebatePDF = async (scoringResult: DebateScoringResult): Promise<void> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Helper para agregar texto
  const addText = (text: string | string[], x: number, y: number, options?: any) => {
    doc.text(text, x, y, options);
  };

  // Título principal
  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  addText('CiceronAI - Evaluación del Debate', pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Fecha
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const date = new Date(scoringResult.date).toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  addText(date, pageWidth / 2, yPos, { align: 'center' });
  yPos += 20;

  // Tema del debate
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  addText('Tema:', margin, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.setTextColor(50, 50, 50);
  const topicLines = doc.splitTextToSize(scoringResult.topic, pageWidth - margin * 2);
  addText(topicLines, margin, yPos);
  yPos += topicLines.length * 6 + 15;

  // Ganador
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  if (scoringResult.winner === 'draw') {
    addText('RESULTADO: EMPATE', margin, yPos);
  } else {
    const winnerName = scoringResult.winner === 'A' ? scoringResult.teamAName : scoringResult.teamBName;
    addText(`GANADOR: ${winnerName}`, margin, yPos);
  }
  yPos += 15;

  // Puntuaciones totales
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  addText(`${scoringResult.teamAName}: ${scoringResult.teamAScore.totalScore} puntos`, margin, yPos);
  yPos += 8;
  addText(`${scoringResult.teamBName}: ${scoringResult.teamBScore.totalScore} puntos`, margin, yPos);
  yPos += 20;

  // Rúbrica por rondas
  DEBATE_RUBRIC.forEach((section) => {
    // Nueva página si es necesario
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    // Título de la sección
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    addText(section.roundName, margin, yPos);
    yPos += 10;

    // Encontrar las puntuaciones de esta ronda para ambos equipos
    const teamARound = scoringResult.teamAScore.roundScores.find(r => r.roundType === section.roundType);
    const teamBRound = scoringResult.teamBScore.roundScores.find(r => r.roundType === section.roundType);

    // Criterios
    doc.setFontSize(9);
    
    section.criteria.forEach((criterion) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const teamAScore = teamARound?.criterionScores.find(c => c.criterionId === criterion.id);
      const teamBScore = teamBRound?.criterionScores.find(c => c.criterionId === criterion.id);

      // Descripción del criterio
      doc.setTextColor(0, 0, 0);
      const criterionLines = doc.splitTextToSize(criterion.description, pageWidth - margin * 2 - 50);
      addText(criterionLines, margin, yPos);
      
      const lineHeight = criterionLines.length * 5;
      
      // Puntuaciones
      doc.setFontSize(10);
      doc.setTextColor(200, 0, 0);
      addText(`${teamAScore?.score || 0}`, pageWidth - margin - 45, yPos);
      
      doc.setTextColor(0, 0, 200);
      addText(`${teamBScore?.score || 0}`, pageWidth - margin - 15, yPos);
      
      yPos += lineHeight + 5;
    });

    yPos += 10;
  });

  // Nueva página para evaluación global
  doc.addPage();
  yPos = 20;

  // Evaluación Global
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  addText('Sumatorio y Evaluación Global', margin, yPos);
  yPos += 15;

  // Equipo A
  doc.setFontSize(14);
  doc.setTextColor(200, 0, 0);
  addText(scoringResult.teamAName, margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  addText(`Conexión entre miembros: ${scoringResult.teamAScore.teamConnectionScore}/4`, margin, yPos);
  yPos += 8;
  
  if (scoringResult.teamAScore.bestSpeaker) {
    addText(`Mejor orador: ${scoringResult.teamAScore.bestSpeaker}`, margin, yPos);
    yPos += 8;
  }
  
  if (scoringResult.teamAScore.overallNotes) {
    doc.setTextColor(100, 100, 100);
    const notesLines = doc.splitTextToSize(`Notas: ${scoringResult.teamAScore.overallNotes}`, pageWidth - margin * 2);
    addText(notesLines, margin, yPos);
    yPos += notesLines.length * 5 + 15;
  }

  // Equipo B
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 200);
  addText(scoringResult.teamBName, margin, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  addText(`Conexión entre miembros: ${scoringResult.teamBScore.teamConnectionScore}/4`, margin, yPos);
  yPos += 8;
  
  if (scoringResult.teamBScore.bestSpeaker) {
    addText(`Mejor orador: ${scoringResult.teamBScore.bestSpeaker}`, margin, yPos);
    yPos += 8;
  }
  
  if (scoringResult.teamBScore.overallNotes) {
    doc.setTextColor(100, 100, 100);
    const notesLines = doc.splitTextToSize(`Notas: ${scoringResult.teamBScore.overallNotes}`, pageWidth - margin * 2);
    addText(notesLines, margin, yPos);
    yPos += notesLines.length * 5;
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    addText(`CiceronAI - Página ${i} de ${totalPages}`, pageWidth / 2, 285, { align: 'center' });
  }

  // Descargar PDF
  const fileName = `evaluacion-${scoringResult.debateId}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
