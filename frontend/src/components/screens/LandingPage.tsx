/**
 * LandingPage - Página inicial principal
 * Hero básico con navegador glassmorphism al estilo curxai.com
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { AuroraBackground, CardNav, LiquidGlassButton } from '../common';
import { MessageSquare, Trophy, Sparkles, Mic, Users, Brain, Clock, Github, Linkedin, Twitter } from 'lucide-react';

interface LandingPageProps {
  onStartDebate: () => void;
  onLogin: (redirectTo?: 'home') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartDebate, onLogin }) => {
  const { isAuthenticated } = useAuthStore();
  const [activeSection, setActiveSection] = useState('home');

  const handleStartDebate = () => {
    if (isAuthenticated) {
      onStartDebate();
    } else {
      onLogin('home');
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'how-it-works':
        scrollToSection('how-it-works');
        break;
      case 'team':
        scrollToSection('team');
        break;
      case 'home':
        scrollToSection('home');
        break;
    }
  };

  // Detectar sección activa al hacer scroll
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'how-it-works', 'team'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    {
      label: "Inicio",
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Empezar", href: "#", ariaLabel: "Empezar debate" },
        { label: "Features", href: "#", ariaLabel: "Ver características" }
      ]
    },
    {
      label: "Cómo funciona",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Inicio", href: "#", ariaLabel: "Ir al inicio" },
        { label: "Proceso", href: "#", ariaLabel: "Ver proceso" }
      ]
    },
    {
      label: "Equipo",
      bgColor: "#271E37", 
      textColor: "#fff",
      links: [
        { label: "Nosotros", href: "#", ariaLabel: "Conocer al equipo" },
        { label: "Contacto", href: "#", ariaLabel: "Contactar" }
      ]
    }
  ];

  return (
    <AuroraBackground>
      <div className="relative overflow-y-auto overflow-x-hidden" style={{ height: '100vh' }}>
        {/* CardNav - Nuevo navbar con tarjetas - Fixed position */}
        <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-auto">
          <CardNav
            items={navItems}
            onLogin={onLogin}
            onNavigate={handleNavigate}
            baseColor="rgba(255, 255, 255, 0.1)"
            menuColor="#fff"
            buttonBgColor="#111"
            buttonTextColor="#fff"
          />
        </div>

        {/* Hero Section - Inicio */}
        <section id="home" className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-32 pb-12 scroll-mt-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Título Principal */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-4">
              CiceronAI
            </h1>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white/80 mb-8">
              El Juez IA de Debate
            </h2>

            {/* Botón CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={handleStartDebate}
                className="group relative px-12 py-5 text-2xl font-bold transition-all duration-300 hover:scale-105 rounded-2xl"
                style={{
                  border: '2px solid transparent',
                  background: 'linear-gradient(#0f172a, #0f172a) padding-box, linear-gradient(to right, #FF6B00, #00E5FF) border-box'
                }}
              >
                <span className="bg-gradient-to-r from-[#FF6B00] to-[#00E5FF] bg-clip-text text-transparent">
                  Empezar un Debate
                </span>
              </button>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              {[
                {
                  icon: MessageSquare,
                  title: 'Debate Estructurado',
                  description: 'Formato profesional con rondas definidas'
                },
                {
                  icon: Trophy,
                  title: 'Evaluación Inteligente',
                  description: 'Rúbrica completa y puntuación justa'
                },
                {
                  icon: Sparkles,
                  title: 'IA Integrada',
                  description: 'Análisis y feedback automatizado'
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <feature.icon className="w-8 h-8 text-[#00E5FF] mx-auto mb-4" />
                  <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                  <p className="text-white/50 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección Cómo Funciona */}
        <section id="how-it-works" className="min-h-screen px-4 sm:px-6 lg:px-8 py-20 border-t border-white/10 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Cómo Funciona
              </h2>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Descubre cómo CiceronAI revoluciona la forma de organizar y evaluar debates
              </p>
            </div>

            {/* Pasos */}
            <div className="space-y-8 mb-16">
              {[
                {
                  icon: Users,
                  title: '1. Configura tu Debate',
                  description: 'Define el tema, los nombres de los equipos y la duración de cada ronda. Puedes personalizar completamente la estructura del debate según tus necesidades.'
                },
                {
                  icon: Mic,
                  title: '2. Grabación Automática',
                  description: 'Durante el debate, la plataforma graba automáticamente cada intervención. No tienes que preocuparte por perder ningún argumento o refutación.'
                },
                {
                  icon: Clock,
                  title: '3. Control del Tiempo',
                  description: 'Temporizador integrado que marca el tiempo restante para cada orador. Visualización clara de qué equipo está activo en cada momento.'
                },
                {
                  icon: Brain,
                  title: '4. Evaluación Inteligente',
                  description: 'Al finalizar, accede a una rúbrica completa de evaluación. Evalúa cada criterio de forma estructurada y obtén puntuaciones justas para ambos equipos.'
                },
                {
                  icon: Trophy,
                  title: '5. Resultados y PDF',
                  description: 'Genera informes en PDF con todos los detalles del debate. Guarda el historial y revisa debates anteriores cuando lo necesites.'
                }
              ].map((step, index) => (
                <div 
                  key={index}
                  className="flex gap-6 p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#FF6B00]/20 to-[#00E5FF]/20 border border-white/10 flex items-center justify-center">
                      <step.icon className="w-7 h-7 text-[#00E5FF]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-white/60 leading-relaxed">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Características */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: 'Estructura Profesional',
                  items: ['Introducciones', 'Refutación 1', 'Refutación 2', 'Conclusiones']
                },
                {
                  title: 'Criterios de Evaluación',
                  items: ['Argumentación', 'Refutación', 'Comunicación', 'Lenguaje', 'Tiempo']
                },
                {
                  title: 'Herramientas IA',
                  items: ['Grabación automática', 'Análisis de intervenciones', 'Feedback estructurado']
                }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10"
                >
                  <h3 className="text-lg font-semibold text-white mb-4">{feature.title}</h3>
                  <ul className="space-y-2">
                    {feature.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-center gap-2 text-white/60 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección Equipo */}
        <section id="team" className="min-h-screen px-4 sm:px-6 lg:px-8 py-20 border-t border-white/10 scroll-mt-20">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Nuestro Equipo
              </h2>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Un grupo de apasionados por el debate y la tecnología trabajando para revolucionar 
                la forma en que practicamos y evaluamos los debates.
              </p>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {[
                {
                  title: 'Innovación',
                  description: 'Utilizamos la última tecnología de IA para mejorar la experiencia del debate.'
                },
                {
                  title: 'Accesibilidad',
                  description: 'Democratizamos el acceso a herramientas profesionales de debate.'
                },
                {
                  title: 'Excelencia',
                  description: 'Nos esforzamos por ofrecer la mejor calidad en cada evaluación.'
                },
                {
                  title: 'Comunidad',
                  description: 'Construimos una comunidad de debatientes apasionados por el aprendizaje.'
                }
              ].map((value, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-xl backdrop-blur-sm bg-white/5 border border-white/10 text-center"
                >
                  <h3 className="text-white font-semibold mb-2">{value.title}</h3>
                  <p className="text-white/50 text-sm">{value.description}</p>
                </div>
              ))}
            </div>

            {/* Miembros del equipo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
              {[
                {
                  name: 'Francisco Pérez',
                  role: 'Fundador & CEO',
                  description: 'Apasionado por el debate y la inteligencia artificial. Creador de la visión de CiceronAI.',
                  avatar: 'FP'
                },
                {
                  name: 'María García',
                  role: 'CTO',
                  description: 'Ingeniera de software especializada en IA y procesamiento de lenguaje natural.',
                  avatar: 'MG'
                },
                {
                  name: 'Carlos López',
                  role: 'Product Designer',
                  description: 'Diseñador UX/UI enfocado en crear experiencias intuitivas y atractivas.',
                  avatar: 'CL'
                },
                {
                  name: 'Ana Martínez',
                  role: 'Debate Coach',
                  description: 'Campeona nacional de debate con más de 10 años de experiencia en oratoria.',
                  avatar: 'AM'
                }
              ].map((member, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#FF6B00] to-[#00E5FF] flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-lg">{member.avatar}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                      <p className="text-[#00E5FF] text-sm mb-2">{member.role}</p>
                      <p className="text-white/60 text-sm">{member.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Contacto */}
            <div className="text-center p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10">
              <h3 className="text-2xl font-bold text-white mb-4">¿Quieres contactarnos?</h3>
              <p className="text-white/60 mb-6">
                Estamos siempre abiertos a colaboraciones, sugerencias y nuevas ideas.
              </p>
              <div className="flex justify-center gap-4">
                <a 
                  href="#" 
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Twitter className="w-5 h-5 text-white/70" />
                </a>
                <a 
                  href="#" 
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Linkedin className="w-5 h-5 text-white/70" />
                </a>
                <a 
                  href="#" 
                  className="p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <Github className="w-5 h-5 text-white/70" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-6 px-4 text-center border-t border-white/10">
          <p className="text-white/40 text-sm">
            © 2026 CiceronAI. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </AuroraBackground>
  );
};
