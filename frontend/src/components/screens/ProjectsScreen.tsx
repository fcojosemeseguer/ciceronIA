/**
 * ProjectsScreen - Pantalla de gestión de proyectos
 */

import React, { useEffect, useState } from 'react';
import { Plus, Loader2, Zap, ArrowLeft } from 'lucide-react';
import { useProjectStore } from '../../store';
import { Project, CreateProjectData } from '../../types';
import { LiquidGlassButton, ProjectCard } from '../common';

interface ProjectsScreenProps {
  onSelectProject: (project: Project) => void;
  onQuickAnalysis: () => void;
  onBack: () => void;
}

export const ProjectsScreen: React.FC<ProjectsScreenProps> = ({
  onSelectProject,
  onQuickAnalysis,
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

    try {
      const projectCode = await createProject(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', debate_type: 'upct' });
      
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
                onClick={onQuickAnalysis}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">Análisis Rápido</span>
              </LiquidGlassButton>

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
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.code}
                      project={project}
                      debateType={debateTypes.find(dt => dt.id === project.debate_type)}
                      onClick={() => onSelectProject(project)}
                    />
                  ))}
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
            relative w-full max-w-md
            backdrop-blur-2xl bg-black/40
            border border-white/10
            rounded-3xl
            shadow-[0_8px_32px_rgba(0,0,0,0.4)]
            p-6
          ">
            <h3 className="text-xl font-bold text-white mb-6">Nuevo Proyecto</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Nombre del proyecto *
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

              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Descripción
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
                  rows={3}
                  placeholder="Descripción opcional del proyecto..."
                />
              </div>

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
                    'Crear'
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
