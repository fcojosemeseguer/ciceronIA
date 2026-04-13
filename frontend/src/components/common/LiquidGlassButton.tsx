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
  style?: React.CSSProperties;
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
  style,
}) => {
  const baseStyles = `
    relative
    font-medium
    transition-all duration-200 ease-out
    border
    rounded-xl
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variantStyles = {
    primary: `
      bg-[var(--action-icon)]
      text-[var(--app-bg-solid)]
      border-transparent
      hover:opacity-90
    `,
    secondary: `
      bg-[var(--app-surface-strong)]
      text-[var(--app-text)]
      border-[var(--app-border)]
      hover:opacity-90
    `,
    danger: `
      bg-[#b91c1c]
      text-white
      border-transparent
      hover:bg-[#991b1b]
    `,
    success: `
      bg-[var(--action-icon)]
      text-[var(--app-bg-solid)]
      border-transparent
      hover:opacity-90
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
      style={style}
      className={`
        ${baseStyles}
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      <span className="flex items-center justify-center gap-2">
        {children}
      </span>
    </button>
  );
};
