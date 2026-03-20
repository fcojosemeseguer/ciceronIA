/**
 * ProjectDetailsScreen - Pantalla de detalles de un proyecto con análisis
 * Muestra información del debate, reporte de análisis y gestión de dashboard compartido
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, FileAudio, BarChart3, Calendar, Link2, ShieldCheck, Copy } from 'lucide-react';
import { AnalysisResult, Project, ShareLink } from '../../types';
import { dashboardService, projectsService } from '../../api';
import { LiquidGlassButton } from '../common';
import { formatDate } from '../../utils/dateUtils';

interface ProjectDetailsScreenProps {
  project: Project;
  onBack: () => void;
  onAddAnalysis: () => void;
}

export const ProjectDetailsScreen: React.FC<ProjectDetailsScreenProps> = ({
  project,
  onBack,
  onAddAnalysis,
}) => {
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const [expiresAt, setExpiresAt] = useState('');
  const [allowFullTranscript, setAllowFullTranscript] = useState(false);
  const [allowRawMetrics, setAllowRawMetrics] = useState(false);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);

  const [createdUrls, setCreatedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.code]);

  const loadProjectData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await projectsService.getProject(project.code);
      setAnalyses(result.analyses);
    } catch (err) {
      setError('Error al cargar los análisis del proyecto');
      console.error(err);
    } finally {
      setIsLoading(false);
    }

    await loadShareLinks();
  };

  const loadShareLinks = async () => {
    setShareLoading(true);
    setShareError(null);
    try {
      const links = await dashboardService.listShareLinks(project.code);
      setShareLinks(links);
    } catch (err: any) {
      setShareError(err?.response?.data?.detail || 'Error al cargar enlaces compartidos');
    } finally {
      setShareLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisIndex: number) => {
    // TODO: Implementar eliminación de análisis en backend
    console.log('Eliminar análisis:', analysisIndex);
  };

  const handleCreateShareLink = async () => {
    setIsCreatingShareLink(true);
    setShareError(null);
    setShareMessage(null);

    try {
      const payload = {
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        allow_full_transcript: allowFullTranscript,
        allow_raw_metrics: allowRawMetrics,
      };

      const link = await dashboardService.createShareLink(project.code, payload);
      setShareLinks((prev) => [link, ...prev]);

      if (link.public_url) {
        setCreatedUrls((prev) => ({ ...prev, [link.share_id]: link.public_url as string }));
      }

      setShareMessage('Enlace creado correctamente.');
      setExpiresAt('');
      setAllowFullTranscript(false);
      setAllowRawMetrics(false);
    } catch (err: any) {
      setShareError(err?.response?.data?.detail || 'No se pudo crear el enlace');
    } finally {
      setIsCreatingShareLink(false);
    }
  };

  const handleRevokeShareLink = async (shareId: string) => {
    setShareError(null);
    setShareMessage(null);

    try {
      await dashboardService.revokeShareLink(project.code, shareId);
      setShareLinks((prev) => prev.map((link) =>
        link.share_id === shareId
          ? { ...link, revoked: true, revoked_at: new Date().toISOString() }
          : link
      ));
      setShareMessage('Enlace revocado correctamente.');
    } catch (err: any) {
      if (err?.response?.status === 410) {
        setShareError('El enlace ya estaba expirado/revocado (410).');
      } else {
        setShareError(err?.response?.data?.detail || 'No se pudo revocar el enlace');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareMessage('Enlace copiado al portapapeles.');
    } catch {
      setShareError('No se pudo copiar automáticamente.');
    }
  };

  const getShareStatus = (link: ShareLink): { label: string; tone: string } => {
    if (link.revoked) {
      return { label: 'Revocado', tone: 'text-red-300' };
    }
    if (new Date(link.expires_at).getTime() < Date.now()) {
      return { label: 'Expirado (410)', tone: 'text-yellow-300' };
    }
    return { label: 'Activo', tone: 'text-green-300' };
  };

  const totalsByPostura = analyses.reduce((acc, analysis) => {
    const existing = acc.find((a) => a.postura === analysis.postura);
    if (existing) {
      existing.total += analysis.total;
      existing.max_total += analysis.max_total;
      existing.count += 1;
    } else {
      acc.push({
        postura: analysis.postura,
        total: analysis.total,
        max_total: analysis.max_total,
        count: 1,
      });
    }
    return acc;
  }, [] as { postura: string; total: number; max_total: number; count: number }[]);

  const winner = useMemo(() => {
    if (totalsByPostura.length === 0) return null;
    return totalsByPostura.reduce((prev, current) =>
      prev.total > current.total ? prev : current
    );
  }, [totalsByPostura]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#00E5FF] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/60">Cargando análisis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">{project.debate_topic || project.name}</h1>
                <p className="text-white/50">{project.team_a_name || 'Equipo A'} vs {project.team_b_name || 'Equipo B'}</p>
              </div>
            </div>

            <LiquidGlassButton
              onClick={onAddAnalysis}
              variant="primary"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Añadir Análisis
            </LiquidGlassButton>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-[#00E5FF]" />
                <span className="text-white/60 text-sm">Fecha</span>
              </div>
              <p className="text-white font-medium">
                {project.created_at ? formatDate(project.created_at) : 'No disponible'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <FileAudio className="w-5 h-5 text-[#00E5FF]" />
                <span className="text-white/60 text-sm">Análisis</span>
              </div>
              <p className="text-white font-medium">{analyses.length} fases analizadas</p>
            </div>

            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-[#00E5FF]" />
                <span className="text-white/60 text-sm">Estado</span>
              </div>
              <p className="text-white font-medium">{analyses.length > 0 ? 'Completado' : 'Pendiente'}</p>
            </div>
          </div>

          <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-[#00E5FF]" />
              <h2 className="text-xl font-bold text-white">Compartir dashboard</h2>
            </div>

            {shareError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {shareError}
              </div>
            )}
            {shareMessage && (
              <div className="mb-4 p-3 rounded-xl bg-green-500/10 border border-green-500/30 text-green-300 text-sm">
                {shareMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
              <div>
                <label className="block text-xs text-white/60 mb-1">Caducidad (opcional)</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white"
                />
              </div>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                <input
                  type="checkbox"
                  checked={allowFullTranscript}
                  onChange={(e) => setAllowFullTranscript(e.target.checked)}
                />
                Transcripción completa
              </label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80">
                <input
                  type="checkbox"
                  checked={allowRawMetrics}
                  onChange={(e) => setAllowRawMetrics(e.target.checked)}
                />
                Métricas crudas
              </label>
              <LiquidGlassButton onClick={handleCreateShareLink} disabled={isCreatingShareLink}>
                {isCreatingShareLink ? 'Generando...' : 'Generar enlace'}
              </LiquidGlassButton>
            </div>

            {shareLoading ? (
              <p className="text-white/60 text-sm">Cargando enlaces...</p>
            ) : shareLinks.length === 0 ? (
              <p className="text-white/60 text-sm">No hay enlaces compartidos todavía.</p>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => {
                  const status = getShareStatus(link);
                  const publicUrl = createdUrls[link.share_id] || link.public_url;

                  return (
                    <div key={link.share_id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <p className="text-white text-sm font-medium">#{link.share_id.slice(0, 8)} · {link.token_prefix}</p>
                        <p className={`text-xs ${status.tone}`}>{status.label}</p>
                      </div>
                      <p className="text-white/60 text-xs mb-2">
                        Expira: {formatDate(link.expires_at)} · transcript={link.allow_full_transcript ? 'full' : 'preview'} · metrics={link.allow_raw_metrics ? 'raw' : 'summary'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {publicUrl ? (
                          <>
                            <LiquidGlassButton
                              variant="secondary"
                              size="sm"
                              onClick={() => copyToClipboard(publicUrl)}
                              className="flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> Copiar enlace
                            </LiquidGlassButton>
                            <LiquidGlassButton
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(publicUrl, '_blank', 'noopener,noreferrer')}
                              className="flex items-center gap-2"
                            >
                              <ShieldCheck className="w-4 h-4" /> Abrir enlace
                            </LiquidGlassButton>
                          </>
                        ) : (
                          <span className="text-xs text-white/50">URL visible solo justo al crear el enlace.</span>
                        )}

                        {!link.revoked && (
                          <LiquidGlassButton
                            variant="danger"
                            size="sm"
                            onClick={() => handleRevokeShareLink(link.share_id)}
                          >
                            Revocar
                          </LiquidGlassButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {totalsByPostura.length > 0 && (
            <div className="mb-8 p-6 rounded-2xl bg-white/5 border border-white/10">
              <h2 className="text-xl font-bold text-white mb-6">Resumen de Puntuaciones</h2>
              <div className="space-y-4">
                {totalsByPostura.map((item) => (
                  <div key={item.postura} className="flex items-center gap-4">
                    <div className="w-32 text-white font-medium">{item.postura}</div>
                    <div className="flex-1 h-8 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          winner?.postura === item.postura
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-[#00E5FF] to-[#00E5FF]/50'
                        }`}
                        style={{ width: `${(item.total / item.max_total) * 100}%` }}
                      />
                    </div>
                    <div className="w-24 text-right">
                      <span className={`text-lg font-bold ${winner?.postura === item.postura ? 'text-yellow-400' : 'text-white'}`}>
                        {item.total}/{item.max_total}
                      </span>
                      {winner?.postura === item.postura && (
                        <span className="ml-2 text-xs text-yellow-400">Ganador</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Análisis Detallados</h2>

            {analyses.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
                <FileAudio className="w-16 h-16 mx-auto mb-4 text-white/20" />
                <h3 className="text-lg font-medium text-white mb-2">No hay análisis</h3>
                <p className="text-white/50 mb-6">Aún no se han analizado audios para este debate</p>
                <LiquidGlassButton onClick={onAddAnalysis} variant="primary">
                  Añadir Primer Análisis
                </LiquidGlassButton>
              </div>
            ) : (
              analyses.map((analysis, index) => (
                <div
                  key={index}
                  className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {analysis.fase} - {analysis.postura}
                      </h3>
                      <p className="text-white/50 text-sm">{analysis.orador}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-[#00E5FF]">
                          {analysis.total}/{analysis.max_total}
                        </p>
                        <p className="text-xs text-white/40">
                          {Math.round((analysis.total / analysis.max_total) * 100)}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteAnalysis(index)}
                        className="p-2 text-white/30 hover:text-red-400 transition-colors"
                        title="Eliminar análisis"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {analysis.criterios.map((criterio, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-4 p-3 rounded-xl bg-white/5"
                      >
                        <div className="w-16 text-center">
                          <span className="text-lg font-bold text-[#00E5FF]">{criterio.nota}</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium mb-1">{criterio.criterio}</p>
                          <p className="text-white/60 text-sm">{criterio.anotacion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsScreen;
