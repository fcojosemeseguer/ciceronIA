/**
 * AnalysisResultsScreen - Pantalla de resultados del análisis
 */

import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Trophy, User } from 'lucide-react';
import { useAnalysisStore, useProjectStore } from '../../store';
import { LiquidGlassButton } from '../common';

interface AnalysisResultsScreenProps {
  onBack: () => void;
}

export const AnalysisResultsScreen: React.FC<AnalysisResultsScreenProps> = ({
  onBack,
}) => {
  const { uploads } = useAnalysisStore();
  const { selectedDebateType } = useProjectStore();
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const completedUploads = uploads.filter((u) => u.status === 'completed' && u.result);

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedResults(newExpanded);
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = score / max;
    if (percentage >= 0.8) return 'text-green-400';
    if (percentage >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Calcular totales por postura
  const totalsByPostura = selectedDebateType?.posturas.map((postura) => {
    const posturaUploads = completedUploads.filter((u) => u.postura === postura);
    const total = posturaUploads.reduce((sum, u) => sum + (u.result?.total || 0), 0);
    const maxTotal = posturaUploads.reduce((sum, u) => sum + (u.result?.max_total || 0), 0);
    return { postura, total, maxTotal, count: posturaUploads.length };
  }) || [];

  const winner = totalsByPostura.reduce((prev, current) =>
    prev.total > current.total ? prev : current
  , totalsByPostura[0]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Resultados del Análisis</h1>
              <p className="text-white/50">{completedUploads.length} análisis completados</p>
            </div>
          </div>

          {/* Resumen General */}
          {totalsByPostura.length > 0 && (
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[#FF6B00]/20 to-[#00E5FF]/20 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Resumen General
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {totalsByPostura.map(({ postura, total, maxTotal }) => (
                  <div
                    key={postura}
                    className={`
                      p-4 rounded-xl
                      ${postura === winner?.postura
                        ? 'bg-yellow-500/20 border border-yellow-500/30'
                        : 'bg-white/5 border border-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white font-medium">{postura}</span>
                      <span className={`text-2xl font-bold ${getScoreColor(total, maxTotal)}`}>
                        {total}/{maxTotal}
                      </span>
                    </div>
                    <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${postura === winner?.postura ? 'bg-yellow-400' : 'bg-[#00E5FF]'}`}
                        style={{ width: `${(total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Resultados */}
          <div className="space-y-4">
            {completedUploads.map((upload) => (
              <div
                key={upload.id}
                className="
                  rounded-xl
                  backdrop-blur-xl bg-white/5
                  border border-white/10
                  overflow-hidden
                "
              >
                <button
                  onClick={() => toggleExpanded(upload.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-[#00E5FF]" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-white">
                        {upload.faseNombre} - {upload.postura}
                      </p>
                      <p className="text-sm text-white/50">{upload.numOradores} orador{upload.numOradores !== 1 ? 'es' : ''}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-lg font-bold ${getScoreColor(
                      upload.result?.total || 0,
                      upload.result?.max_total || 1
                    )}`}>
                      {upload.result?.total}/{upload.result?.max_total}
                    </span>
                    {expandedResults.has(upload.id) ? (
                      <ChevronUp className="w-5 h-5 text-white/50" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-white/50" />
                    )}
                  </div>
                </button>

                {expandedResults.has(upload.id) && upload.result && (
                  <div className="px-4 pb-4 border-t border-white/10">
                    <div className="pt-4 space-y-2">
                      {upload.result.criterios.map((criterio, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-4 p-3 rounded-lg bg-white/5"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white mb-1">
                              {criterio.criterio}
                            </p>
                            {criterio.anotacion && (
                              <p className="text-xs text-white/50">
                                {criterio.anotacion}
                              </p>
                            )}
                          </div>
                          <span className={`text-sm font-bold ${getScoreColor(
                            criterio.nota,
                            selectedDebateType?.escala_max || 4
                          )}`}>
                            {criterio.nota}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {completedUploads.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/50">No hay resultados disponibles</p>
              <LiquidGlassButton onClick={onBack} variant="secondary" className="mt-4">
                Volver al Análisis
              </LiquidGlassButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultsScreen;
