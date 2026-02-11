/**
 * Navbar - Componente de navegación con indicador de burbuja
 * El indicador se ajusta dinámicamente al ancho del texto
 */

import React, { useRef, useEffect, useState } from 'react';

interface NavbarProps {
  currentPage: 'home' | 'how-it-works' | 'team';
  onHome: () => void;
  onHowItWorks: () => void;
  onTeam: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentPage, 
  onHome, 
  onHowItWorks, 
  onTeam
}) => {
  const navItems = [
    { id: 'how-it-works', label: 'Cómo funciona', onClick: onHowItWorks },
    { id: 'home', label: 'Inicio', onClick: onHome },
    { id: 'team', label: 'Equipo', onClick: onTeam },
  ];

  const [bubbleStyle, setBubbleStyle] = useState({ left: 0, width: 0 });
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const activeIndex = navItems.findIndex(item => item.id === currentPage);
    const activeButton = buttonRefs.current[activeIndex];
    const container = containerRef.current;
    
    if (activeButton && container) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      setBubbleStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width
      });
    }
  }, [currentPage]);

  return (
    <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-2 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Enlaces de navegación con burbuja */}
        <div ref={containerRef} className="relative flex items-center">
          {/* Burbuja indicadora */}
          <div 
            className="absolute h-8 bg-white/20 rounded-full transition-all duration-300 ease-out"
            style={{
              left: bubbleStyle.left,
              width: bubbleStyle.width,
            }}
          />
          
          {navItems.map((item, index) => (
            <button
              key={item.id}
              ref={el => { buttonRefs.current[index] = el; }}
              onClick={item.onClick}
              className={`
                relative z-10 px-4 py-1.5 text-sm font-medium transition-colors duration-200 whitespace-nowrap
                ${currentPage === item.id ? 'text-white' : 'text-white/60 hover:text-white/80'}
              `}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
};
