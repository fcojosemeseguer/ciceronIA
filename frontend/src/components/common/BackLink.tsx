import React from 'react';
import backIcon from '../../assets/icons/icon-left.svg';

interface BackLinkProps {
  label?: string;
  onClick: () => void;
  className?: string;
}

export const BackLink: React.FC<BackLinkProps> = ({ label = 'Volver', onClick, className = '' }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 text-[20px] text-[#2C2C2C] hover:opacity-85 ${className}`}
    >
      <img src={backIcon} alt="" aria-hidden className="h-6 w-6" />
      <span>{label}</span>
    </button>
  );
};

export default BackLink;
