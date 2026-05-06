/**
 * TeamScreen - Página "Equipo"
 * Muestra información sobre el equipo detrás de CiceronAI
 */

import React from 'react';
import { AuroraBackground, LiquidGlassButton, CardNav } from '../common';
import { MessageSquare } from 'lucide-react';

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
        { label: "Configuracion", href: "#", ariaLabel: "Ver configuracion" },
        { label: "Evaluacion", href: "#", ariaLabel: "Ver evaluacion" }
      ]
    }
  ];
  const configBlocks = [
    {
      title: 'Datos generales',
      description: 'Nombre, tema y descripcion opcional del debate.'
    },
    {
      title: 'Posturas',
      description: 'Configuracion general de los dos lados del debate.'
    },
    {
      title: 'Formato',
      description: 'Seleccion de estructura y fases de evaluacion.'
    },
    {
      title: 'Resultados',
      description: 'Evaluacion final, metricas y visualizaciones.'
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
                Configuracion final
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Pantalla orientada a preparar el debate sin personas, fotos ni datos de ejemplo.
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

            {/* Configuracion */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-16">
              {configBlocks.map((block, index) => (
                <div 
                  key={index}
                  className="p-6 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="mb-2 text-sm uppercase tracking-[0.14em] text-white/40">Bloque {index + 1}</p>
                    <h3 className="text-lg font-semibold text-white">{block.title}</h3>
                    <p className="mt-2 text-white/60 text-sm">{block.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Enfoque */}
            <div className="text-center p-8 rounded-2xl backdrop-blur-sm bg-white/5 border border-white/10 mb-16">
              <h2 className="text-2xl font-bold text-white mb-4">Listo para configurar</h2>
              <p className="text-white/60 mb-6">
                El flujo se centra en preparar el debate y avanzar directamente a la evaluacion.
              </p>
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
