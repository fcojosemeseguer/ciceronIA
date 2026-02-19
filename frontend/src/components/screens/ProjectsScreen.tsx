/**
 * ProjectsScreen - Pantalla de gestión de proyectos
 */

import React, { useEffect, useState } from 'react';
import { Plus, Loader2, ArrowLeft, FileAudio, Mic } from 'lucide-react';
import { useProjectStore } from '../../store';
import { Project, CreateProjectData } from '../../types';
import { LiquidGlassButton } from '../common';

interface ProjectsScreenProps {
  onSelectProject: (project: Project) => void;
  onStartLiveDebate: (project: Project) => void;
  onBack: () => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  onSelectProject,
  onStartLiveDebate,
  onBack,
}) => {
  const {
    projects,
    debateTypes,
    isLoading,
    error,
    fetchProjects,
    fetchDebateTypes,
    createProject,
    clearError,
  } = useProjectStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<CreateProjectData>({
    name: '',
    description: '',
    debate_type: 'upct',
    team_a_name: 'Equipo A',
    team_b_name: 'Equipo B',
    debate_topic: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    fetchProjects();
    fetchDebateTypes();
  }, [fetchProjects, fetchDebateTypes]);

  const handleCreateProject = async () => {
    if (!formData.name.trim()) {
      setFormError('El nombre del proyecto es obligatorio');
      return;
    }

    if (!formData.debate_topic?.trim()) {
      setFormError('El tema del debate es obligatorio');
      return;
    }

    try {
      const projectCode = await createProject(formData);
      setShowCreateModal(false);
      setFormData({ 
        name: '', 
        description: '', 
        debate_type: 'upct',
        team_a_name: 'Equipo A',
        team_b_name: 'Equipo B',
        debate_topic: '',
      });
      
      // Seleccionar el proyecto recién creado
      const newProject = useProjectStore.getState().projects.find(p => p.code === projectCode);
      if (newProject) {
        onSelectProject(newProject);
      }
    } catch (err) {
      setFormError('Error al crear el proyecto');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-y-auto pb-32">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white/70" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">Mis Proyectos</h1>
                <p className="text-white/50">Gestiona tus debates y análisis</p>
              </div>
            </div>

            <div className="flex gap-3">
              <LiquidGlassButton
                onClick={() => {
                  setFormError('');
                  clearError();
                  setShowCreateModal(true);
                }}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Proyecto</span>
              </LiquidGlassButton>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Loading */}
          {isLoading && projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin mb-4" />
              <p className="text-white/50">Cargando proyectos...</p>
            </div>
          ) : (
            <>
              {projects.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Plus className="w-10 h-10 text-white/30" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No tienes proyectos</h3>
                  <p className="text-white/50 mb-6">Crea tu primer proyecto para comenzar</p>
                  <LiquidGlassButton
                    onClick={() => setShowCreateModal(true)}
                    variant="primary"
                  >
                    Crear Proyecto
                  </LiquidGlassButton>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => {
                    const debateType = debateTypes.find(dt => dt.id === project.debate_type);
                    return (
                      <div
                        key={project.code}
                        className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all"
                      >
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-white mb-1">{project.name}</h3>
                          <p className="text-sm text-white/50">{project.debate_topic}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-[#00E5FF]/20 text-[#00E5FF]">
                              {debateType?.nombre || project.debate_type}
                            </span>
                            <span className="text-xs text-white/40">
                              {project.team_a_name} vs {project.team_b_name}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => onSelectProject(project)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                          >
                            <FileAudio className="w-4 h-4" />
                            <span className="text-sm">Analizar Audio</span>
                          </button>
                          <button
                            onClick={() => onStartLiveDebate(project)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#00E5FF]/20 border border-[#00E5FF]/30 rounded-xl text-[#00E5FF] hover:bg-[#00E5FF]/30 transition-colors"
                          >
                            <Mic className="w-4 h-4" />
                            <span className="text-sm">Debate en Directo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="
            relative w-full max-w-2xl max-h-[90vh] overflow-y-auto
            backdrop-blur-2xl bg-black/40
            border border-white/10
            rounded-3xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            p-6
          ">
            <h3 className="text-xl font-bold text-white mb-6">Nuevo Debate</h3>

            <div className="space-y-4">
              {/* Nombre del proyecto */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Nombre del debate *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setFormError('');
                  }}
                  className="
                    w-full px-4 py-3
                    bg-white/5 border border-white/10
                    rounded-xl text-white
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                  "
                  placeholder="Ej: Torneo UPCT 2024"
                />
              </div>

              {/* Tema del debate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Tema del debate *
                </label>
                <input
                  type="text"
                  value={formData.debate_topic}
                  onChange={(e) => {
                    setFormData({ ...formData, debate_topic: e.target.value });
                    setFormError('');
                  }}
                  className="
                    w-full px-4 py-3
                    bg-white/5 border border-white/10
                    rounded-xl text-white
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                  "
                  placeholder="Ej: ¿Debería implementarse la jornada laboral de 4 días?"
                />
              </div>

              {/* Equipos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#FF6B00] mb-2">
                    Equipo A (A favor) *
                  </label>
                  <input
                    type="text"
                    value={formData.team_a_name}
                    onChange={(e) => {
                      setFormData({ ...formData, team_a_name: e.target.value });
                      setFormError('');
                    }}
                    className="
                      w-full px-4 py-3
                      bg-white/5 border border-white/10
                      rounded-xl text-white
                      focus:outline-none focus:border-[#FF6B00]/50
                      transition-colors
                    "
                    placeholder="Nombre del equipo A"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#00E5FF] mb-2">
                    Equipo B (En contra) *
                  </label>
                  <input
                    type="text"
                    value={formData.team_b_name}
                    onChange={(e) => {
                      setFormData({ ...formData, team_b_name: e.target.value });
                      setFormError('');
                    }}
                    className="
                      w-full px-4 py-3
                      bg-white/5 border border-white/10
                      rounded-xl text-white
                      focus:outline-none focus:border-[#00E5FF]/50
                      transition-colors
                    "
                    placeholder="Nombre del equipo B"
                  />
                </div>
              </div>

              {/* Tipo de debate */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Tipo de debate
                </label>
                <select
                  value={formData.debate_type}
                  onChange={(e) => setFormData({ ...formData, debate_type: e.target.value })}
                  className="
                    w-full px-4 py-3
                    bg-white/5 border border-white/10
                    rounded-xl text-white
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                    appearance-none cursor-pointer
                  "
                >
                  {debateTypes.map((dt) => (
                    <option key={dt.id} value={dt.id} className="bg-slate-900">
                      {dt.nombre}
                    </option>
                  ))}
                  {debateTypes.length === 0 && (
                    <>
                      <option value="upct" className="bg-slate-900">I Torneo UPCT</option>
                      <option value="retor" className="bg-slate-900">Formato RETOR</option>
                    </>
                  )}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="
                    w-full px-4 py-3
                    bg-white/5 border border-white/10
                    rounded-xl text-white
                    focus:outline-none focus:border-[#00E5FF]/50
                    transition-colors
                    resize-none
                  "
                  rows={2}
                  placeholder="Notas adicionales sobre el debate..."
                />
              </div>

              {formError && (
                <p className="text-sm text-red-400">{formError}</p>
              )}

              <div className="flex gap-3 pt-4">
                <LiquidGlassButton
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancelar
                </LiquidGlassButton>

                <LiquidGlassButton
                  onClick={handleCreateProject}
                  variant="primary"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Crear Debate'
                  )}
                </LiquidGlassButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsScreen;
