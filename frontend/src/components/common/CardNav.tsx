import React, { useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { LogIn, ArrowUpRight, LogOut, ChevronDown, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
};

export interface CardNavProps {
  logo?: string;
  logoAlt?: string;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  onLogin?: (redirectTo?: 'home') => void;
  onNavigate?: (page: string) => void;
  onSettingsClick?: () => void;
}

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor = 'var(--app-surface-strong)',
  buttonTextColor = 'var(--app-text)',
  onLogin,
  onNavigate,
  onSettingsClick,
}) => {
  const { user, logout } = useAuthStore();
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const navRef = useRef<HTMLDivElement | null>(null);
  const cardsRef = useRef<HTMLDivElement[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const calculateHeight = () => {
    const navEl = navRef.current;
    if (!navEl) return 260;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      const contentEl = navEl.querySelector('.card-nav-content') as HTMLElement;
      if (contentEl) {
        const wasVisible = contentEl.style.visibility;
        const wasPointerEvents = contentEl.style.pointerEvents;
        const wasPosition = contentEl.style.position;
        const wasHeight = contentEl.style.height;

        contentEl.style.visibility = 'visible';
        contentEl.style.pointerEvents = 'auto';
        contentEl.style.position = 'static';
        contentEl.style.height = 'auto';

        void contentEl.offsetHeight;

        const topBar = 60;
        const padding = 16;
        const contentHeight = contentEl.scrollHeight;

        contentEl.style.visibility = wasVisible;
        contentEl.style.pointerEvents = wasPointerEvents;
        contentEl.style.position = wasPosition;
        contentEl.style.height = wasHeight;

        return topBar + contentHeight + padding;
      }
    }

    return 260;
  };

  const createTimeline = () => {
    const navEl = navRef.current;
    if (!navEl) return null;

    gsap.set(navEl, { height: 60, overflow: 'visible' });
    gsap.set(cardsRef.current, { y: 50, opacity: 0 });

    const tl = gsap.timeline({ paused: true });
    tl.to(navEl, {
      height: calculateHeight,
      duration: 0.4,
      ease,
    });
    tl.to(cardsRef.current, { y: 0, opacity: 1, duration: 0.4, ease, stagger: 0.08 }, '-=0.1');

    return tl;
  };

  useLayoutEffect(() => {
    const tl = createTimeline();
    tlRef.current = tl;

    return () => {
      tl?.kill();
      tlRef.current = null;
    };
  }, [ease, items]);

  useLayoutEffect(() => {
    const handleResize = () => {
      if (!tlRef.current) return;

      if (isExpanded) {
        const newHeight = calculateHeight();
        gsap.set(navRef.current, { height: newHeight });

        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          newTl.progress(1);
          tlRef.current = newTl;
        }
      } else {
        tlRef.current.kill();
        const newTl = createTimeline();
        if (newTl) {
          tlRef.current = newTl;
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  const toggleMenu = () => {
    const tl = tlRef.current;
    if (!tl) return;

    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      tl.play(0);
    } else {
      setIsHamburgerOpen(false);
      tl.reverse();
      setTimeout(() => setIsExpanded(false), 400);
    }
  };

  const setCardRef = (i: number) => (el: HTMLDivElement | null) => {
    if (el) cardsRef.current[i] = el;
  };

  const handleCardClick = (itemLabel: string) => {
    if (onNavigate) {
      const pageMap: { [key: string]: string } = {
        'Cómo funciona': 'how-it-works',
        'Equipo': 'team',
        'Inicio': 'home',
      };
      const page = pageMap[itemLabel] || itemLabel.toLowerCase().replace(/\s+/g, '-');
      onNavigate(page);
    }
    if (isExpanded) {
      toggleMenu();
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    gsap.set(navRef.current, { overflow: 'visible' });
  };

  return (
    <div className={`card-nav-container fixed left-1/2 -translate-x-1/2 w-[92%] max-w-[820px] z-[99] top-[0.8em] md:top-[1.2em] ${className}`}>
      <nav
        ref={navRef}
        className="block h-[60px] rounded-xl relative overflow-visible will-change-[height] backdrop-blur-xl border"
        style={{ background: 'rgba(2,6,23,0.68)', borderColor: 'rgba(255,255,255,0.10)', boxShadow: '0 18px 48px rgba(2,6,23,0.38)' }}
      >
        <div className="card-nav-top absolute inset-x-0 top-0 h-[60px] flex items-center justify-between gap-3 p-2 pl-4 pr-3 z-[2]">
          <div
            className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''} group h-full flex flex-col items-center justify-center cursor-pointer gap-[6px] shrink-0`}
            onClick={toggleMenu}
            role="button"
            aria-label={isExpanded ? 'Cerrar menu' : 'Abrir menu'}
            tabIndex={0}
            style={{ color: menuColor || '#fff' }}
          >
            <div
              className={`hamburger-line w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${
                isHamburgerOpen ? 'translate-y-[4px] rotate-45' : ''
              } group-hover:opacity-75`}
            />
            <div
              className={`hamburger-line w-[30px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${
                isHamburgerOpen ? '-translate-y-[4px] -rotate-45' : ''
              } group-hover:opacity-75`}
            />
          </div>

          <div className="logo-container flex items-center gap-3 min-w-0 md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img src="/logo.svg" alt={logoAlt} className="w-full h-full object-contain" />
            </div>
            <span className="brand-wordmark text-lg font-bold tracking-tight hidden sm:block text-white">
              CICERONIA
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown((prev) => !prev)}
                  className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-lg border transition-all duration-300"
                  style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)' }}
                >
                  <div className="w-7 h-7 rounded-full border flex items-center justify-center font-semibold text-xs" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.9)' }}>
                    {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block text-sm font-medium max-w-[110px] truncate text-white/90">
                    {user.name || user.email}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showUserDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserDropdown(false)} />
                    <div className="absolute right-0 top-full mt-2 w-56 backdrop-blur-xl border rounded-xl overflow-hidden z-50" style={{ background: 'rgba(2,6,23,0.92)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 18px 48px rgba(2,6,23,0.42)' }}>
                      <div className="p-3 border-b border-white/10">
                        <p className="font-medium text-sm truncate text-white">{user.name}</p>
                        <p className="text-xs truncate text-white/50">{user.email}</p>
                      </div>
                      {onSettingsClick && (
                        <button
                          onClick={() => {
                            onSettingsClick();
                            setShowUserDropdown(false);
                          }}
                          className="w-full px-4 py-3 flex items-center gap-2 text-white/85 hover:bg-white/5 transition-colors text-sm"
                        >
                          <Settings className="w-4 h-4 text-white/70" />
                          <span>Configuracion</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-3 flex items-center gap-2 text-red-300 hover:bg-red-500/10 transition-colors text-sm"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Cerrar sesion</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onLogin?.()}
                className="hidden sm:inline-flex border-0 rounded-lg px-4 items-center gap-2 h-[40px] font-medium cursor-pointer transition-all duration-300 hover:opacity-90"
                style={{ backgroundColor: buttonBgColor, color: buttonTextColor }}
              >
                <LogIn className="w-4 h-4" />
                Iniciar sesion
              </button>
            )}
          </div>
        </div>

        <div
          className={`card-nav-content absolute left-0 right-0 top-[60px] bottom-0 p-2 flex flex-col items-stretch gap-2 justify-start z-[1] ${
            isExpanded ? 'visible pointer-events-auto' : 'invisible pointer-events-none'
          } md:flex-row md:items-end md:gap-[12px]`}
          aria-hidden={!isExpanded}
        >
          {(items || []).slice(0, 3).map((item, idx) => (
            <div
              key={`${item.label}-${idx}`}
              className="nav-card select-none relative flex flex-col gap-2 p-[12px_16px] rounded-[calc(0.75rem-0.2rem)] min-w-0 flex-[1_1_auto] h-auto min-h-[60px] md:h-full md:min-h-0 md:flex-[1_1_0%] cursor-pointer transition-transform duration-300 hover:scale-[1.02]"
              ref={setCardRef(idx)}
              style={{ backgroundColor: item.bgColor, color: item.textColor }}
              onClick={() => handleCardClick(item.label)}
            >
              <div className="nav-card-label font-normal tracking-[-0.5px] text-[18px] md:text-[22px]">
                {item.label}
              </div>
              <div className="nav-card-links mt-auto flex flex-col gap-[2px]">
                {item.links?.map((lnk, i) => (
                  <a
                    key={`${lnk.label}-${i}`}
                    className="nav-card-link inline-flex items-center gap-[6px] no-underline cursor-pointer transition-opacity duration-300 hover:opacity-75 text-[15px] md:text-[16px]"
                    href={lnk.href}
                    aria-label={lnk.ariaLabel}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onNavigate) {
                        const pageMap: { [key: string]: string } = {
                          'Inicio': 'home',
                          'Cómo funciona': 'how-it-works',
                          'Equipo': 'team',
                        };
                        const page = pageMap[lnk.label] || lnk.label.toLowerCase().replace(/\s+/g, '-');
                        onNavigate(page);
                        if (isExpanded) {
                          toggleMenu();
                        }
                      }
                    }}
                  >
                    <ArrowUpRight className="nav-card-link-icon shrink-0" aria-hidden="true" />
                    {lnk.label}
                  </a>
                ))}
              </div>
            </div>
          ))}

          {user && (
            <div
              className="nav-card select-none relative flex flex-col gap-2 p-[12px_16px] rounded-[calc(0.75rem-0.2rem)] min-w-0 flex-[1_1_auto] h-auto min-h-[60px] sm:hidden"
              style={{ backgroundColor: '#0f172a', color: '#fff' }}
            >
              <div className="nav-card-label font-normal tracking-[-0.5px] text-[18px]">
                Sesion
              </div>
              {onSettingsClick && (
                <button
                  onClick={() => {
                    onSettingsClick();
                    if (isExpanded) {
                      toggleMenu();
                    }
                  }}
                  className="inline-flex items-center gap-[8px] text-left text-[15px] text-white/85 hover:opacity-80 transition-opacity"
                >
                  <Settings className="w-4 h-4 shrink-0 text-white/70" />
                  Configuracion
                </button>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-[8px] text-left text-[15px] text-red-300 hover:opacity-80 transition-opacity"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
