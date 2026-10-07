import { useState } from 'react';
import { ASSETS } from '../../data/assets';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-xl',
  };

  return (
    <div className={`flex items-center gap-3 group ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0 transition-transform group-hover:scale-105`}
      >
        {!imageError ? (
          <img
            src={ASSETS.logoPrimary}
            alt="Apex Filings Logo"
            className="w-full h-full object-contain"
            onError={() => setImageError(true)}
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-[#F04623] rounded flex items-center justify-center text-white font-black text-xs">
            AF
          </div>
        )}
      </div>
      {showText && (
        <div className="flex flex-col text-left">
          <span className="text-lg font-bold tracking-tight text-[#0F172A] leading-tight group-hover:text-[#F04623] transition-colors">
            Apex Filings
          </span>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 -mt-0.5">
            Incorporations
          </span>
        </div>
      )}
    </div>
  );
}
