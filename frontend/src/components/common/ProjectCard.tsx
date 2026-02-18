/**
 * ProjectCard - Tarjeta de proyecto para el grid
 */

import React from 'react';
import { Calendar, MessageSquare, ChevronRight } from 'lucide-react';
import { Project, DebateType } from '../../types';

interface ProjectCardProps {
  project: Project;
  debateType: DebateType | undefined;
  onClick: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  debateType,
  onClick,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha desconocida';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDebateTypeLabel = () => {
    if (debateType) return debateType.nombre;
    return project.debate_type === 'upct' ? 'I Torneo UPCT' : 'Formato RETOR';
  };

  return (
    <button
      onClick={onClick}
      className="
        group relative w-full text-left
        p-5 rounded-2xl
        backdrop-blur-xl bg-white/5
        border border-white/10
        hover:bg-white/10 hover:border-white/20
        transition-all duration-300
      "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-1 truncate">
            {project.name}
          </h3>
          
          {project.description && (
            <p className="text-sm text-white/50 mb-3 line-clamp-2">
              {project.description}
            </p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span className="
              px-2 py-1 rounded-md
              bg-white/5 border border-white/10
            ">
              {getDebateTypeLabel()}
            </span>
            
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(project.created_at)}
            </span>
          </div>
        </div>

        <div className="
          flex items-center justify-center
          w-10 h-10 rounded-xl
          bg-white/5 group-hover:bg-white/10
          transition-colors
        ">
          <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60" />
        </div>
      </div>
    </button>
  );
};

export default ProjectCard;
