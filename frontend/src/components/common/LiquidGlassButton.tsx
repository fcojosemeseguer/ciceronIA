/**
 * LiquidGlassButton - Botón con efecto vidrio líquido estilo Apple
 * Glassmorphism con efectos de brillo y profundidad
 */

import React from 'react';

interface LiquidGlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}) => {
  const baseStyles = `
    relative overflow-hidden
    font-medium
    transition-all duration-300 ease-out
    backdrop-blur-xl
    border border-white/20
    rounded-2xl
    group
    disabled:opacity-50 disabled:cursor-not-allowed
    disabled:hover:shadow-none
  `;

  const variantStyles = {
    primary: `
      bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40
      hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50
      text-white
      shadow-[0_8px_32px_rgba(31,42,51,0.4)]
      hover:shadow-[0_12px_40px_rgba(31,42,51,0.6)]
      before:absolute before:inset-0
      before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
      before:translate-x-[-200%] before:hover:translate-x-[200%]
      before:transition-transform before:duration-700
    `,
    secondary: `
      bg-gradient-to-br from-[#1F2A33]/60 to-[#1F2A33]/30
      hover:from-[#1F2A33]/70 hover:to-[#1F2A33]/40
      text-white/90
      shadow-[0_8px_32px_rgba(31,42,51,0.3)]
      hover:shadow-[0_12px_40px_rgba(31,42,51,0.5)]
    `,
    danger: `
      bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40
      hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50
      text-white
      shadow-[0_8px_32px_rgba(31,42,51,0.4)]
      hover:shadow-[0_12px_40px_rgba(31,42,51,0.6)]
    `,
    success: `
      bg-gradient-to-br from-[#1F2A33]/80 to-[#1F2A33]/40
      hover:from-[#1F2A33]/90 hover:to-[#1F2A33]/50
      text-white
      shadow-[0_8px_32px_rgba(31,42,51,0.4)]
      hover:shadow-[0_12px_40px_rgba(31,42,51,0.6)]
    `,
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {/* Efecto de brillo en los bordes */}
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/30 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Borde brillante */}
      <span className="absolute inset-0 rounded-2xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Contenido */}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
