/**
 * TeamScreen - Página "Equipo"
 * Muestra información sobre el equipo detrás de CiceronAI
 */

import React from 'react';
import { AuroraBackground, LiquidGlassButton, CardNav } from '../common';
import { MessageSquare, Github, Linkedin, Twitter } from 'lucide-react';

interface TeamScreenProps {
  onBack: () => void;
  onHome: () => void;
  onHowItWorks: () => void;
  onLogin: (redirectTo?: 'home') => void;
}

export const TeamScreen: React.FC<TeamScreenProps> = ({ onBack, onHome, onHowItWorks, onLogin }) => {

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'how-it-works':
        onHowItWorks();
        break;
      case 'team':
        // Ya estamos aquí
        break;
      case 'home':
        onHome();
        break;
    }
  };

  const navItems = [
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
      label: "Inicio", 
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Empezar", href: "#", ariaLabel: "Empezar debate" },
        { label: "Features", href: "#", ariaLabel: "Ver características" }
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
  const teamMembers = [
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
  ];

  const values = [
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
  ];

  return (
    <AuroraBackground>
      <div className="min-h-screen flex flex-col">
        {/* CardNav - Nuevo navbar con tarjetas */}
        <CardNav
          items={navItems}
          onLogin={onLogin}
          onNavigate={handleNavigate}
          baseColor="rgba(255, 255, 255, 0.1)"
          menuColor="#fff"
          buttonBgColor="#111"
          buttonTextColor="#fff"
        />

        {/* Contenido */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-28 pb-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Nuestro Equipo
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Un grupo de apasionados por el debate y la tecnología trabajando para revolucionar 
                la forma en que practicamos y evaluamos los debates.
              </p>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {values.map((value, index) => (
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
              {teamMembers.map((member, index) => (
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
            <div className="text-center p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">¿Quieres contactarnos?</h2>
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

            {/* CTA */}
            <div className="text-center">
              <LiquidGlassButton
                onClick={onBack}
                variant="primary"
                size="lg"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Empezar un Debate</span>
              </LiquidGlassButton>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 px-4 text-center">
          <p className="text-white/40 text-sm">
            © 2026 CiceronAI. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </AuroraBackground>
  );
};
