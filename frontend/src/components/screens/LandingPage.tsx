/**
 * LandingPage - Pantalla de inicio publica con estilo clean.
 */

import React from 'react';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { BrandHeader } from '../common';

interface LandingPageProps {
  onStartDebate: () => void;
  onLogin: (redirectTo?: 'home') => void;
  onOpenSettings?: () => void;
}

const howItWorksSteps = [
  {
    title: '1. Configura tu debate',
    text: 'Define tema, equipos y formato en segundos. Todo queda preparado para empezar sin friccion.',
  },
  {
    title: '2. Debate en vivo o analisis',
    text: 'Puedes dirigir el debate en tiempo real o subir audios para analizarlo por fases.',
  },
  {
    title: '3. Dashboard y evaluacion',
    text: 'Visualiza progreso, puntuaciones y resultados por fase de forma clara y accionable.',
  },
];

const teamMembers = [
  { name: 'Miembro 1', role: 'Producto', bio: 'Vision de producto, experiencia y flujo general.' },
  { name: 'Miembro 2', role: 'IA / Datos', bio: 'Analisis, scoring y modelos de evaluacion.' },
  { name: 'Miembro 3', role: 'Frontend', bio: 'Interfaz, rendimiento y experiencia visual.' },
  { name: 'Miembro 4', role: 'Backend', bio: 'APIs, persistencia y estabilidad del sistema.' },
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDebate, onLogin, onOpenSettings }) => {
  const { isAuthenticated } = useAuthStore();

  const handleStart = () => {
    if (isAuthenticated) {
      onStartDebate();
      return;
    }
    onLogin('home');
  };

  return (
    <div className="min-h-screen overflow-y-auto bg-[#F5F5F3] text-[#2C2C2C]">
      <header className="sticky top-0 z-20 border-b border-[#1C1D1F]/10 bg-[#F5F5F3]/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between px-5 py-3 sm:px-8">
          <div className="w-[120px]" />
          <BrandHeader className="!mb-0 scale-[0.9] sm:scale-100" />
          <div className="flex w-[120px] items-center justify-end gap-2">
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#1C1D1F] bg-white text-[#2C2C2C] transition-opacity hover:opacity-80"
                aria-label="Configuracion"
              >
                <Settings className="h-5 w-5" />
              </button>
            )}
            {!isAuthenticated && (
              <button
                type="button"
                onClick={() => onLogin('home')}
                className="rounded-xl border border-[#1C1D1F] bg-white px-4 py-2 text-sm font-semibold text-[#2C2C2C] transition-opacity hover:opacity-80"
              >
                Iniciar sesion
              </button>
            )}
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="mx-auto flex min-h-[72vh] w-full max-w-[1240px] flex-col items-center justify-center px-5 py-16 text-center sm:px-8">
          <h1 className="mb-4 text-[52px] leading-none text-[#2C2C2C] sm:text-[68px]">Tu juez IA de debate</h1>
          <p className="mb-8 max-w-[760px] text-[20px] text-[#5E5E5E] sm:text-[24px]">
            Organiza debates, continua sesiones y evalua cada fase en una experiencia limpia y profesional.
          </p>
          <button
            type="button"
            onClick={handleStart}
            className="rounded-2xl border border-[#2F6437] bg-[#3A7D44] px-14 py-4 text-[34px] font-semibold leading-none text-[#F5F5F3] transition-all hover:brightness-95"
          >
            Empezar
          </button>
        </section>

        <section id="how-it-works" className="border-y border-[#1C1D1F]/10 bg-[#E6C068]">
          <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-16">
            <div className="mb-10">
              <h2 className="text-[44px] leading-none text-[#2C2C2C] sm:text-[56px]">Como funciona</h2>
              <p className="mt-3 max-w-[760px] text-[19px] text-[#4B3F1D] sm:text-[22px]">
                Flujo directo para preparar, ejecutar y evaluar debates. Aqui puedes colocar capturas o ilustraciones despues.
              </p>
            </div>

            <div className="space-y-6">
              {howItWorksSteps.map((step, index) => (
                <article key={step.title} className="grid gap-4 rounded-2xl border-[3px] border-[#1C1D1F] bg-[#F5F5F3] p-4 sm:grid-cols-[1.1fr_1fr] sm:p-5">
                  <div>
                    <h3 className="text-[30px] leading-none text-[#2C2C2C] sm:text-[36px]">{step.title}</h3>
                    <p className="mt-3 text-[18px] leading-relaxed text-[#5E5E5E] sm:text-[20px]">{step.text}</p>
                    <div className="mt-4 inline-flex rounded-full border border-[#1C1D1F] bg-white px-3 py-1 text-sm font-medium text-[#2C2C2C]">
                      Paso {index + 1}
                    </div>
                  </div>
                  <div className="rounded-xl border-2 border-dashed border-[#1C1D1F]/40 bg-white p-4">
                    <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg bg-[#F5F5F3] text-center text-[#7A7A7A]">
                      Placeholder imagen explicativa {index + 1}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="team" className="bg-[#3A7D44]">
          <div className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 sm:py-16">
            <div className="mb-10">
              <h2 className="text-[44px] leading-none text-[#F5F5F3] sm:text-[56px]">Equipo</h2>
              <p className="mt-3 max-w-[760px] text-[19px] text-[#E7F3E9] sm:text-[22px]">
                Apartado para presentar al equipo y la vision del proyecto.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {teamMembers.map((member, index) => (
                <article key={member.name} className="rounded-2xl border-[3px] border-[#1C1D1F] bg-[#F5F5F3] p-5">
                  <div className="mb-4 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#1C1D1F]/35 bg-white text-sm text-[#7A7A7A]">
                      Foto
                    </div>
                    <div>
                      <h3 className="text-[28px] leading-none text-[#2C2C2C]">{member.name}</h3>
                      <p className="mt-1 text-[18px] text-[#3A7D44]">{member.role}</p>
                    </div>
                  </div>
                  <p className="text-[17px] leading-relaxed text-[#5E5E5E]">{member.bio}</p>
                  <div className="mt-4 rounded-xl border border-[#1C1D1F]/20 bg-white px-3 py-2 text-sm text-[#7A7A7A]">
                    Placeholder descripcion ampliada / enlaces del miembro {index + 1}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
