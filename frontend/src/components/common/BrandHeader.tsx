import React from 'react';
import laurelLeft from '../../assets/icons/logo-laurel-left.svg';
import laurelRight from '../../assets/icons/logo-laurel-right.svg';

interface BrandHeaderProps {
  className?: string;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ className = '' }) => {
  return (
    <div className={`flex h-14 items-center justify-center gap-0 ${className}`}>
      <img
        src={laurelLeft}
        alt=""
        className="h-10 w-10 sm:h-12 sm:w-12"
        aria-hidden
        draggable={false}
        style={{ filter: 'brightness(0) saturate(100%) invert(36%) sepia(31%) saturate(782%) hue-rotate(80deg) brightness(93%) contrast(88%)' }}
      />
      <span className="brand-wordmark min-w-[286px] text-center text-[38px] leading-none text-[#1C1D1F] dark:text-[#1C1D1F]">
        CICERONIA
      </span>
      <img
        src={laurelRight}
        alt=""
        className="h-10 w-10 sm:h-12 sm:w-12"
        aria-hidden
        draggable={false}
        style={{ filter: 'brightness(0) saturate(100%) invert(36%) sepia(31%) saturate(782%) hue-rotate(80deg) brightness(93%) contrast(88%)' }}
      />
    </div>
  );
};

export default BrandHeader;
