'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence
} from 'motion/react';
import React, { Children, cloneElement, useEffect, useRef, useState } from 'react';
import { Home, ArrowLeft, User, Settings } from 'lucide-react';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, val => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize
    };
    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(mouseDistance, [-distance, 0, distance], [baseItemSize, magnification, baseItemSize]);
  const size = useSpring(targetSize, spring);

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
        background: 'var(--glass-bg-strong)',
        borderColor: 'var(--glass-border)',
        boxShadow: '0 12px 24px rgba(15, 23, 42, 0.14)',
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`relative inline-flex items-center justify-center rounded-full border cursor-pointer ${className}`}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      {Children.map(children, child =>
        React.isValidElement(child)
          ? cloneElement(child as React.ReactElement<{ isHovered?: MotionValue<number> }>, { isHovered })
          : child
      )}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({ children, className = '', isHovered }: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;
    const unsubscribe = isHovered.on('change', latest => {
      setIsVisible(latest === 1);
    });
    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: -10 }}
          exit={{ opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={`${className} absolute -top-7 left-1/2 w-fit whitespace-pre rounded-md border px-2 py-1 text-xs`}
          style={{ background: 'var(--glass-bg-strong)', borderColor: 'var(--glass-border)', color: 'var(--app-text)', x: '-50%' }}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({ children, className = '' }: DockIconProps) {
  return <div className={`flex items-center justify-center ${className}`}>{children}</div>;
}

export default function Dock({
  items,
  className = '',
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = 70,
  distance = 200,
  panelHeight = 64,
  baseItemSize = 50
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  // Altura fija - no se expande hacia arriba
  const height = useSpring(panelHeight, spring);

  return (
    <motion.div 
      style={{ height, scrollbarWidth: 'none' }} 
      className="fixed bottom-4 left-0 right-0 flex justify-center z-50"
      onMouseMove={({ pageX }) => {
        isHovered.set(1);
        mouseX.set(pageX);
      }}
      onMouseLeave={() => {
        isHovered.set(0);
        mouseX.set(Infinity);
      }}
    >
      <motion.div
        className={`${className} flex items-end gap-4 px-4 pb-3 backdrop-blur-xl border rounded-2xl`}
        style={{ background: 'var(--glass-bg)', borderColor: 'var(--glass-border)', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.16)' }}
      >
        {items.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
          >
            <DockIcon>
              {item.icon}
            </DockIcon>
            <DockLabel>
              {item.label}
            </DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}

// Hook para usar el dock en las pantallas
export function useDock({
  onGoHome,
  onGoBack,
  onProfile,
  onSettings
}: {
  onGoHome?: () => void;
  onGoBack?: () => void;
  onProfile?: () => void;
  onSettings?: () => void;
}) {
  const items: DockItemData[] = [
    {
      icon: <Home size={20} style={{ color: 'var(--app-text)' }} />,
      label: 'Inicio',
      onClick: () => onGoHome?.()
    },
    {
      icon: <ArrowLeft size={20} style={{ color: 'var(--app-text)' }} />,
      label: 'Volver',
      onClick: () => onGoBack?.()
    },
    {
      icon: <User size={20} style={{ color: 'var(--app-text)' }} />,
      label: 'Perfil',
      onClick: () => onProfile?.()
    },
    {
      icon: <Settings size={20} style={{ color: 'var(--app-text)' }} />,
      label: 'Configuración',
      onClick: () => onSettings?.()
    }
  ];

  return { items };
}
