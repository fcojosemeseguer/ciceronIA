import React from 'react';
import laurelLeft from '../../assets/icons/logo-laurel-left.svg';
import laurelRight from '../../assets/icons/logo-laurel-right.svg';

interface BrandHeaderProps {
  className?: string;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({ className = '' }) => {
  return (
    <div className={`flex h-14 items-center justify-center gap-1.5 ${className}`}>
      <img src={laurelLeft} alt="" className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
      <span className="brand-wordmark min-w-[320px] text-center text-[38px] leading-none text-[#1C1D1F] dark:text-[#1C1D1F]">
        CICERONIA
      </span>
      <img src={laurelRight} alt="" className="h-10 w-10 sm:h-12 sm:w-12" aria-hidden />
    </div>
  );
};

export default BrandHeader;
