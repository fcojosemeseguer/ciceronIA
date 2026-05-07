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
  title = 'CICERONIA',
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
      <div className="w-full">
        <div
          className="
            relative
            overflow-visible
            border
            rounded-none
          "
          style={{
            background: 'var(--app-surface)',
            borderColor: 'var(--app-border)',
            boxShadow: '0 4px 12px rgba(2, 6, 23, 0.08)',
          }}
        >
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'var(--app-border)' }} />

          <div className="relative px-4 py-2.5 flex items-center justify-between gap-3">
            <div
              onClick={onTitleClick}
              className={`flex items-center gap-3 min-w-0 ${onTitleClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : 'cursor-default'}`}
            >
              <span className="brand-wordmark text-lg sm:text-xl font-bold tracking-tight truncate" style={{ color: 'var(--app-text)' }}>
                {title}
              </span>
            </div>

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
                      border
                      transition-all duration-300
                    "
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      borderColor: 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-full border flex items-center justify-center font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium max-w-[150px] truncate text-white/90">
                      {user.name || user.email}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''} text-white/60`} />
                  </button>

                  {showUserDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                      <div className="absolute right-0 top-full mt-2 w-60 backdrop-blur-xl border rounded-xl overflow-hidden z-50" style={{ background: 'rgba(2,6,23,0.92)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 18px 48px rgba(2,6,23,0.42)' }}>
                        <div className="p-4 border-b border-white/10">
                          <p className="font-medium truncate text-white">{user.name}</p>
                          <p className="text-sm truncate text-white/50">{user.email}</p>
                        </div>
                        {onSettingsClick && (
                          <button
                            onClick={() => {
                              onSettingsClick();
                              setShowUserDropdown(false);
                            }}
                            className="w-full px-4 py-3 flex items-center gap-3 transition-colors hover:opacity-80"
                            style={{ color: 'rgba(255,255,255,0.88)' }}
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
                className="md:hidden p-2 transition-colors"
                style={{ color: 'rgba(255,255,255,0.72)' }}
                aria-label={isMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {isMenuOpen && (
            <div className="md:hidden border-t border-white/10 backdrop-blur-xl px-4 py-4 bg-slate-950/70">
              {showUserMenu && user ? (
                <div className="space-y-3">
                  {onSettingsClick && (
                    <button
                      onClick={() => {
                        onSettingsClick();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.88)' }}
                    >
                      <Settings className="w-4 h-4 text-white/70" />
                      <span className="text-sm">Configuracion</span>
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                    style={{ borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate text-white">{user.name || user.email}</p>
                      <p className="text-sm truncate text-white/50">{user.email}</p>
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
