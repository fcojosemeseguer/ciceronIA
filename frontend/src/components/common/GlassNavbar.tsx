/**
 * GlassNavbar - Barra de navegación con efecto Glassmorphism
 * Fondo translúcido, desenfoque suave, bordes redondeados
 * Estilo futurista y minimalista
 */

import React, { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface GlassNavbarProps {
  title?: string;
  showUserMenu?: boolean;
  rightContent?: React.ReactNode;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  title = 'CiceronAI',
  showUserMenu = true,
  rightContent,
}) => {
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      {/* Fondo glassmorphism */}
      <div className="mx-4 mt-4">
        <div 
          className="
            relative
            backdrop-blur-2xl
            bg-white/5
            border border-white/10
            rounded-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.3)]
            overflow-hidden
          "
        >
          {/* Efecto de brillo en el borde superior */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          
          {/* Efecto de brillo en las esquinas */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-white/10 to-transparent rounded-tr-2xl" />
          
          {/* Contenido */}
          <div className="relative px-6 py-4 flex items-center justify-between">
            {/* Logo - Izquierda */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/30 to-orange-500/30 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                {title}
              </span>
            </div>

            {/* Enlaces - Centro (en desktop) */}
            <div className="hidden md:flex items-center gap-8">
              <a 
                href="#" 
                className="text-white/70 hover:text-white transition-colors text-sm font-medium tracking-wide"
              >
                Inicio
              </a>
              <a 
                href="#" 
                className="text-white/70 hover:text-white transition-colors text-sm font-medium tracking-wide"
              >
                Debates
              </a>
              <a 
                href="#" 
                className="text-white/70 hover:text-white transition-colors text-sm font-medium tracking-wide"
              >
                Evaluaciones
              </a>
            </div>

            {/* Derecha - User menu o contenido personalizado */}
            <div className="flex items-center gap-4">
              {rightContent}
              
              {showUserMenu && user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    className="
                      flex items-center gap-3
                      px-4 py-2
                      rounded-xl
                      bg-white/5
                      hover:bg-white/10
                      border border-white/10
                      hover:border-white/20
                      transition-all duration-300
                    "
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-orange-500 flex items-center justify-center text-white font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden sm:block text-white/90 text-sm font-medium">
                      {user.name || user.email}
                    </span>
                  </button>

                  {/* Dropdown */}
                  {showUserDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserDropdown(false)}
                      />
                      <div className="
                        absolute right-0 top-full mt-2 w-56
                        backdrop-blur-2xl
                        bg-black/40
                        border border-white/10
                        rounded-xl
                        shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                        overflow-hidden
                        z-50
                      ">
                        <div className="p-4 border-b border-white/10">
                          <p className="text-white font-medium truncate">{user.name}</p>
                          <p className="text-white/50 text-sm truncate">{user.email}</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            logout();
                            setShowUserDropdown(false);
                          }}
                          className="
                            w-full px-4 py-3
                            flex items-center gap-3
                            text-[#FF6B00]
                            hover:bg-[#FF6B00]/10
                            transition-colors
                          "
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Cerrar sesión</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Menú móvil */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Menú móvil desplegable */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-white/10 backdrop-blur-xl bg-black/20">
              <div className="px-6 py-4 space-y-3">
                <a href="#" className="block text-white/70 hover:text-white transition-colors py-2">Inicio</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors py-2">Debates</a>
                <a href="#" className="block text-white/70 hover:text-white transition-colors py-2">Evaluaciones</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
