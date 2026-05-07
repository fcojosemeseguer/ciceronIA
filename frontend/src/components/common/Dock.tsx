import React from 'react';
import backIcon from '../../assets/icons/icon-back.svg';
import settingsIcon from '../../assets/icons/icon-settings.svg';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
  active?: boolean;
};

export type DockProps = {
  items: DockItemData[];
  className?: string;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
};

export default function Dock({
  items,
  className = '',
  panelHeight = 74,
  baseItemSize = 56,
}: DockProps) {
  return (
    <div className="flex justify-center px-4">
      <div
        className={`${className} flex items-center gap-3 rounded-2xl border px-3 py-2`}
        style={{
          minHeight: panelHeight,
          background: '#E8E8E8',
          borderColor: 'rgba(44,44,44,0.14)',
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        }}
      >
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`inline-flex items-center justify-center rounded-full border transition-opacity hover:opacity-85 ${item.className || ''}`}
            style={{
              width: baseItemSize,
              height: baseItemSize,
              background: item.active ? '#D0D0CD' : '#F5F5F3',
              borderColor: item.active ? 'rgba(44,44,44,0.2)' : 'rgba(44,44,44,0.08)',
              boxShadow: item.active ? 'inset 0 2px 6px rgba(0,0,0,0.15)' : 'none',
            }}
            aria-label={typeof item.label === 'string' ? item.label : undefined}
          >
            {item.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useDock({
  onGoBack,
  onSettings,
}: {
  onGoBack?: () => void;
  onSettings?: () => void;
}) {
  const items: DockItemData[] = [
    {
      icon: <img src={backIcon} alt="" className="h-6 w-6" aria-hidden />,
      label: 'Volver',
      onClick: () => onGoBack?.(),
    },
    {
      icon: <img src={settingsIcon} alt="" className="h-6 w-6" aria-hidden />,
      label: 'Ajustes',
      onClick: () => onSettings?.(),
    },
  ];

  return { items };
}
