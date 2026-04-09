/**
 * GlassNavbar - Barra de navegacion glass compacta
 */

import React, { useState } from 'react';
import { Menu, X, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface GlassNavbarProps {
  title?: string;
  showUserMenu?: boolean;
  rightContent?: React.ReactNode;
  onTitleClick?: () => void;
  onSettingsClick?: () => void;
}

export const GlassNavbar: React.FC<GlassNavbarProps> = ({
  title = 'CiceronIA',
  showUserMenu = true,
  rightContent,
  onTitleClick,
  onSettingsClick,
}) => {
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    setIsMenuOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto mt-4 w-[calc(100%-1.5rem)] max-w-4xl px-3">
        <div
          className="
            relative
            overflow-visible
            backdrop-blur-xl
            bg-slate-950/60
            border border-white/10
            rounded-2xl
            shadow-[0_18px_48px_rgba(2,6,23,0.38)]
          "
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          <div className="relative px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
            <button
              onClick={onTitleClick}
              className={`flex items-center gap-3 min-w-0 ${onTitleClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'}`}
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-center shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <svg
                  viewBox="0 0 24 24"
                  className="w-6 h-6 text-white/90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                {title}
              </span>
            </button>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {rightContent}

              {showUserMenu && user && (
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowUserDropdown((prev) => !prev)}
                    className="
                      flex items-center gap-2
                      px-3 py-2
                      rounded-xl
                      bg-white/[0.04]
                      hover:bg-white/[0.07]
                      border border-white/10
                      hover:border-white/15
                      transition-all duration-300
                    "
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white/90 text-sm font-medium max-w-[150px] truncate">
                      {user.name || user.email}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showUserDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                      <div className="absolute right-0 top-full mt-2 w-60 backdrop-blur-xl bg-slate-950/92 border border-white/10 rounded-xl shadow-[0_18px_48px_rgba(2,6,23,0.42)] overflow-hidden z-50">
                        <div className="p-4 border-b border-white/10">
                          <p className="text-white font-medium truncate">{user.name}</p>
                          <p className="text-white/50 text-sm truncate">{user.email}</p>
                        </div>
                        {onSettingsClick && (
                          <button
                            onClick={() => {
                              onSettingsClick();
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 text-white/85 hover:bg-white/5 transition-colors"
                          >
                            <Settings className="w-4 h-4 text-white/70" />
                            <span>Configuracion</span>
                          </button>
                        )}
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-3 flex items-center gap-3 text-red-300 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Cerrar sesion</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden border-t border-white/10 backdrop-blur-xl bg-slate-950/70 px-4 py-4">
              {showUserMenu && user ? (
                <div className="space-y-3">
                  {onSettingsClick && (
                    <button
                      onClick={() => {
                        onSettingsClick();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white/85 hover:bg-white/10 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-white/70" />
                      <span className="text-sm">Configuracion</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{user.name || user.email}</p>
                      <p className="text-white/50 text-sm truncate">{user.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-red-300 shrink-0">
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Cerrar sesion</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="text-white/60 text-sm">Menu</div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default GlassNavbar;
