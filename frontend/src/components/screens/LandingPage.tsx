import React, { useState } from 'react';
import { Menu, X, ChevronRight, UserCircle2 } from 'lucide-react';
import laurelLeft from '../../assets/icons/logo-laurel-left.svg';
import laurelRight from '../../assets/icons/logo-laurel-right.svg';
import backgroundImage from '../../assets/illustrations/background.webp';
import birdsFlying from '../../assets/illustrations/birds-flying.webp';
import demoGif from '../../assets/illustrations/demo.gif';
import { useAuthStore } from '../../store/authStore';

interface LandingPageProps {
  onStartDebate: () => void;
  onLogin: (redirectTo?: 'landing' | 'dashboard') => void;
  onOpenSettings?: () => void;
}

type LandingView = 'home' | 'demos' | 'about';

const navItems: Array<{ id: LandingView; label: string }> = [
  { id: 'home', label: 'HOME' },
  { id: 'demos', label: 'DEMO' },
  { id: 'about', label: 'ABOUT' },
];

const aiTeamMembers = ['Diana Kozlovska', 'Jorge García', 'Francisco José Meseguer'];
const debateTeamMembers = [
  'Covadonga Sánchez',
  'Adriana Blanco',
  'Gabriel Muñoz',
  'Francisco José Saura',
  'Marina Sánchez',
  'Juan Rodrigo Calatrava',
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDebate, onLogin, onOpenSettings }) => {
  const { isAuthenticated } = useAuthStore();
  const [view, setView] = useState<LandingView>('home');
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStart = () => {
    if (isAuthenticated) {
      onStartDebate();
      return;
    }
    onLogin('dashboard');
  };

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#F5F5F3] text-[#2C2C2C]">
      <div
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${backgroundImage})`,
          opacity: 0.95,
        }}
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(245,245,243,0.30),rgba(245,245,243,0.40))]" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]" />
      <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
        <img
          src={birdsFlying}
          alt=""
          aria-hidden
          draggable={false}
          className="landing-birds-motion absolute bottom-[-8%] left-[50%] h-auto w-[240px] -translate-x-1/2 select-none sm:w-[300px] lg:w-[360px]"
        />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[1240px] flex-col px-5 py-6 sm:px-8 sm:py-8">
        <header className="rounded-[26px] border border-[#1C1D1F]/6 bg-[#ECECEC]/90 px-5 py-4 backdrop-blur-sm sm:px-8">
          <div className="hidden items-center justify-between md:flex">
            <nav className="flex items-center gap-11">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                    className={`inline-flex h-8 items-center text-[24px] font-medium leading-none transition-opacity ${
                    view === item.id ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              {onOpenSettings && isAuthenticated && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1C1D1F]/80 bg-white/80"
                  aria-label="Perfil de usuario"
                >
                  <UserCircle2 className="h-6 w-6" />
                </button>
              )}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => onLogin('landing')}
                  className="rounded-[18px] border-2 border-[#111] bg-[#F5F5F3] px-7 py-3 text-[24px] font-medium leading-none"
                >
                  Login
                </button>
              )}
              <button
                type="button"
                onClick={handleStart}
                className="rounded-[18px] border-2 border-black bg-black px-8 py-3 text-[24px] font-medium leading-none text-[#F5F5F3]"
              >
                Empezar
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between md:hidden">
            <span className="brand-wordmark text-[26px] leading-none">CICERONIA</span>
            <button
              type="button"
              aria-label="Abrir menu"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#1C1D1F]/20 bg-white/90"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </header>

        {menuOpen && (
          <div className="mt-3 rounded-2xl border border-[#1C1D1F]/10 bg-[#F5F5F3]/95 p-4 shadow-sm md:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    setMenuOpen(false);
                  }}
                  className={`rounded-xl px-4 py-3 text-left text-lg font-medium ${
                    view === item.id ? 'bg-[#ECECEC]' : 'bg-transparent'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={() => onLogin('landing')}
                  className="rounded-xl border border-[#1C1D1F] bg-white px-4 py-3 text-left text-lg font-medium"
                >
                  Login
                </button>
              )}
              <button
                type="button"
                onClick={handleStart}
                className="rounded-xl border border-black bg-black px-4 py-3 text-left text-lg font-medium text-white"
              >
                Empezar
              </button>
            </div>
          </div>
        )}

        <main className={`flex flex-1 justify-center py-8 ${view === 'home' ? 'items-center' : 'items-start'}`}>
          {view === 'home' && (
            <section className="-mt-12 text-center sm:-mt-16">
              <div className="mb-10 flex items-center justify-center gap-2 sm:gap-4">
                <img
                  src={laurelLeft}
                  alt=""
                  className="h-28 w-28 select-none sm:h-36 sm:w-36"
                  aria-hidden
                  draggable={false}
                  style={{ filter: 'brightness(0) saturate(100%) invert(36%) sepia(31%) saturate(782%) hue-rotate(80deg) brightness(93%) contrast(88%)' }}
                />
                <h1 className="brand-wordmark text-[60px] leading-none sm:text-[122px]">CICERONIA</h1>
                <img
                  src={laurelRight}
                  alt=""
                  className="h-28 w-28 select-none sm:h-36 sm:w-36"
                  aria-hidden
                  draggable={false}
                  style={{ filter: 'brightness(0) saturate(100%) invert(36%) sepia(31%) saturate(782%) hue-rotate(80deg) brightness(93%) contrast(88%)' }}
                />
              </div>
              <p className="text-[30px] font-medium leading-none sm:text-[52px]">Tu Juez de Debate.</p>
              <p className="mt-3 text-[22px] leading-none text-[#2C2C2C]/90 sm:text-[38px]">Impulsado por IA</p>
              <button
                type="button"
                onClick={handleStart}
                className="mt-16 inline-flex items-center gap-3 rounded-[20px] border-[2.5px] border-[#C8A446] bg-[linear-gradient(180deg,#ECCA70_0%,#DFB95A_100%)] px-8 py-4 text-[24px] font-semibold leading-none text-[#1B1B1B] shadow-[0_12px_28px_rgba(28,29,31,0.24)] transition-all hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 sm:px-10 sm:text-[30px]"
              >
                Comenzar un debate
                <ChevronRight className="h-7 w-7 sm:h-8 sm:w-8" />
              </button>
            </section>
          )}

          {view === 'demos' && (
            <section className="w-full max-w-[1240px] text-left">
              <h2 className="text-center text-[52px] font-medium leading-none text-[#2C2C2C] sm:text-[68px]">Demo</h2>
              <p className="mt-6 text-center text-[48px] font-normal leading-none text-[#2C2C2C] sm:text-[58px]">¿Cómo funciona?</p>

              <div className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr,520px]">
                <div className="space-y-8 text-[24px] font-extralight leading-none text-[#2C2C2C] sm:text-[48px]">
                  <p>I. Crea debate</p>
                  <p>II. Elige entre los 2 Modos</p>
                  <p>III. Configura el Debate</p>
                  <p>VI. Empieza a Debatir</p>
                  <p>V. Consulta las Evaluaciones</p>
                </div>

                <div className="rounded-[26px] bg-[#CECED1]/85 p-2">
                  <div className="aspect-[4/3] w-full overflow-hidden rounded-[22px]">
                    <img
                      src={demoGif}
                      alt="Demo de CiceronIA"
                      className="h-full w-full object-cover object-[center_54%]"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {view === 'about' && (
            <section className="w-full max-w-[1180px] text-left">
              <h2 className="text-center text-[52px] font-medium leading-none text-[#2C2C2C] sm:text-[68px]">About</h2>
              <p className="mx-auto mt-6 max-w-[980px] text-[18px] font-normal leading-[1.2] text-[#2C2C2C]/92 sm:text-[26px]">
                CiceronIA nació como un reto impulsado por el profesor Pablo Pavón, de la Universidad Politécnica de Cartagena.
                Su propuesta reunió a dos equipos —IA y Debate— con un objetivo ambicioso: desarrollar un juez de debate basado
                en inteligencia artificial.
                <br />
                <span className="whitespace-nowrap">El resto es historia...</span>
              </p>

              <div className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr,1.45fr]">
                <article>
                  <h3 className="text-center text-[42px] font-light leading-none text-[#2C2C2C] sm:text-[64px]">Equipo IA</h3>
                  <div className="mt-7">
                    <div className="mx-auto w-full max-w-[430px] text-center">
                      <div className="mx-auto h-[84px] w-[84px] rounded-full bg-[#CFCFD1]" />
                      <p className="mt-2 text-[18px] font-light leading-[1.15] text-[#2C2C2C] sm:text-[24px]">{aiTeamMembers[1]}</p>
                    </div>
                    <div className="mx-auto mt-5 grid max-w-[520px] grid-cols-2 gap-x-6">
                      <div className="text-center">
                        <div className="mx-auto h-[84px] w-[84px] rounded-full bg-[#CFCFD1]" />
                        <p className="mt-2 whitespace-pre-line text-[18px] font-light leading-[1.15] text-[#2C2C2C] sm:text-[24px]">{aiTeamMembers[0]}</p>
                      </div>
                      <div className="text-center">
                        <div className="mx-auto h-[84px] w-[84px] rounded-full bg-[#CFCFD1]" />
                        <p className="mt-2 whitespace-pre-line text-[18px] font-light leading-[1.15] text-[#2C2C2C] sm:text-[24px]">{aiTeamMembers[2]}</p>
                      </div>
                    </div>
                  </div>
                </article>

                <article>
                  <h3 className="text-center text-[42px] font-light leading-none text-[#2C2C2C] sm:text-[64px]">Equipo Debate</h3>
                  <div className="mt-7 grid gap-x-5 gap-y-7 sm:grid-cols-3">
                    {debateTeamMembers.map((member) => (
                      <div key={member} className="text-center">
                        <div className="mx-auto h-[84px] w-[84px] rounded-full bg-[#CFCFD1]" />
                        <p className="mt-2 whitespace-pre-line text-[18px] font-light leading-[1.15] text-[#2C2C2C] sm:text-[24px]">{member}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default LandingPage;
