/**
 * DashboardScreen - Pantalla principal unificada
 */

import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { BrandHeader } from '../common';
import { ReactComponent as PlusIcon } from '../../assets/icons/icon-plus.svg';
import { ReactComponent as HistoryIcon } from '../../assets/icons/icon-history.svg';

interface DashboardScreenProps {
  onNewDebate: () => void;
  onAnalyzeRecorded: () => void;
  onViewHistory: () => void;
  onNewLiveDebate?: () => void;
  onNewAnalysis?: () => void;
  onViewDebates?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onNewDebate,
  onViewHistory,
  onViewDebates,
}) => {
  const { user } = useAuthStore();

  const menuItems = [
    {
      id: 'new-debate',
      title: 'Nuevo Debate',
      icon: (
        <PlusIcon
          aria-hidden
          className="h-[96px] w-[96px] sm:h-[130px] sm:w-[130px]"
          style={{ color: 'var(--brand-gold)' }}
        />
      ),
      onClick: onNewDebate,
    },
    {
      id: 'debates',
      title: 'Debates Anteriores',
      icon: <HistoryIcon aria-hidden className="h-[96px] w-[96px] sm:h-[130px] sm:w-[130px]" style={{ color: '#FFFFFF' }} />,
      onClick: onViewDebates || onViewHistory,
    },
  ];

  return (
    <div className="app-shell overflow-y-auto">
      <div className="pt-8 pb-32 px-5 sm:px-8">
        <div className="mx-auto w-full max-w-[1200px]">
          <BrandHeader className="mb-9" />

          <div className="mb-4 inline-flex rounded-2xl bg-[#E8E8E8] px-4 py-1.5">
            <h1 className="text-[38px] font-extrabold uppercase leading-none tracking-tight text-[#2C2C2C]">
              Panel de Control
            </h1>
          </div>
          <p className="mb-10 text-[34px] sm:text-[52px] leading-none text-[#2C2C2C]">
            {user?.name ? `Bienvenido @${user.name}` : 'Bienvenido @usuario'}
          </p>

          <div className="mx-auto grid max-w-[1080px] grid-cols-1 justify-items-center gap-12 md:grid-cols-2 md:gap-20">
            {menuItems.map((item) => {
              const isPrimary = item.id === 'new-debate';
              return (
                <button key={item.id} onClick={item.onClick} className="group flex flex-col items-center text-center">
                  <div
                    className="flex h-[300px] w-[460px] max-w-[92vw] items-center justify-center rounded-[20px] border border-transparent transition-opacity duration-150 group-hover:opacity-90"
                    style={{ background: isPrimary ? 'var(--brand-green)' : 'var(--brand-dark)' }}
                  >
                    {item.icon}
                  </div>
                  <p className="mt-5 w-[460px] max-w-[92vw] whitespace-nowrap text-center text-[34px] sm:text-[44px] leading-none text-[#2C2C2C]">
                    {item.title}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
