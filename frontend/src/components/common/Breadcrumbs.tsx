import React from 'react';

export type Crumb = {
  label: string;
  onClick?: () => void;
};

interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex min-h-[32px] items-center gap-1 overflow-x-auto whitespace-nowrap text-[16px] sm:text-[20px] text-[#2C2C2C]/85 ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={`${item.label}-${index}`}>
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="rounded-md px-1 py-1 leading-none hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C2C2C]/40"
            >
              {item.label}
            </button>
          ) : (
            <span>{item.label}</span>
          )}
          {index < items.length - 1 && <span>&gt;</span>}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
