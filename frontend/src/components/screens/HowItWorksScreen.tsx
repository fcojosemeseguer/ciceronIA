/**
 * HowItWorksScreen - Página "Cómo funciona"
 * Explica el funcionamiento de la plataforma
 */

import React from 'react';
import { AuroraBackground, LiquidGlassButton, CardNav } from '../common';
import { Mic, Users, Trophy, Brain, Clock, MessageSquare } from 'lucide-react';

interface HowItWorksScreenProps {
  onBack: () => void;
  onHome: () => void;
  onTeam: () => void;
  onLogin: (redirectTo?: 'home') => void;
}

export const HowItWorksScreen: React.FC<HowItWorksScreenProps> = ({ onBack, onHome, onTeam, onLogin }) => {

  const handleNavigate = (page: string) => {
    switch (page) {
      case 'how-it-works':
        // Ya estamos aquí
        break;
      case 'team':
        onTeam();
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
  const steps = [
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
  ];

  const features = [
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
                Cómo Funciona
              </h1>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Descubre cómo CiceronAI revoluciona la forma de organizar y evaluar debates
              </p>
            </div>

            {/* Pasos */}
            <div className="space-y-8 mb-16">
              {steps.map((step, index) => (
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {features.map((feature, index) => (
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
