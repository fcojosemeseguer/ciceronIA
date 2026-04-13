/**
 * DebateModeScreen - Seleccion entre Debate En Vivo o Analizar Grabacion
 */

import React from 'react';
import { BrandHeader, Breadcrumbs } from '../common';
import liveIcon from '../../assets/icons/icon-live.svg';
import analysisIcon from '../../assets/icons/icon-audio-analysis.svg';

interface DebateModeScreenProps {
  onSelectLive: () => void;
  onSelectRecorded: () => void;
  onBack: () => void;
}

export const DebateModeScreen: React.FC<DebateModeScreenProps> = ({
  onSelectLive,
  onSelectRecorded,
  onBack,
}) => {
  const modes = [
    {
      id: 'live',
      title: 'Debate en Vivo',
      icon: <img src={liveIcon} alt="" className="h-28 w-28 sm:h-36 sm:w-36" style={{ filter: 'brightness(0) invert(1)' }} aria-hidden />,
      onClick: onSelectLive,
    },
    {
      id: 'recorded',
      title: 'Analizar Grabacion',
      icon: <img src={analysisIcon} alt="" className="h-28 w-28 sm:h-36 sm:w-36" style={{ filter: 'brightness(0) saturate(100%) invert(38%) sepia(29%) saturate(668%) hue-rotate(346deg) brightness(92%) contrast(88%)' }} aria-hidden />,
      onClick: onSelectRecorded,
    },
  ];

  return (
    <div className="app-shell overflow-y-auto">
      <div className="pt-8 pb-32 px-5 sm:px-8">
        <div className="mx-auto w-full max-w-[1040px]">
          <BrandHeader className="mb-8" />
          <Breadcrumbs
            className="mb-3"
            items={[
              { label: 'Panel de Control', onClick: onBack },
              { label: 'Nuevo Debate' },
            ]}
          />
          <div className="mb-8">
            <h1 className="text-[46px] sm:text-[62px] leading-none text-[#2C2C2C]">Selecciona el modo</h1>
          </div>

          <div className="mx-auto flex max-w-[760px] flex-col gap-6">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={mode.onClick}
                className="group flex min-h-[188px] items-center justify-between rounded-[20px] px-10 py-6 text-left transition-opacity duration-150 hover:opacity-92"
                style={{
                  background: mode.id === 'live' ? 'var(--brand-green)' : 'var(--brand-gold)',
                }}
              >
                <div className="flex h-full flex-col justify-between">
                  <h2
                    className="text-[44px] sm:text-[66px] font-bold leading-[0.95]"
                    style={{ color: mode.id === 'live' ? '#F5F5F3' : 'var(--brand-brown)' }}
                  >
                    {mode.id === 'live' ? (
                      <>
                        Debate
                        <br />
                        en vivo
                      </>
                    ) : (
                      <>
                        Analisis
                        <br />
                        de audio
                      </>
                    )}
                  </h2>
                  <p
                    className="text-[64px] leading-none"
                    style={{ color: mode.id === 'live' ? '#F5F5F3' : 'var(--brand-brown)' }}
                  >
                    {mode.id === 'live' ? '→' : '←'}
                  </p>
                </div>
                <div className="shrink-0" style={{ color: mode.id === 'live' ? '#F5F5F3' : 'var(--brand-brown)' }}>{mode.icon}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebateModeScreen;
