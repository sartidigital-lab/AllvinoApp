'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
  variant?: 'ghost' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  badge?: number;
}

const sizeStyles = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const iconSizes = {
  sm: 'text-[18px]',
  md: 'text-[22px]',
  lg: 'text-[24px]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, variant = 'ghost', size = 'md', badge, className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          rounded-full transition-all duration-150
          ${
            variant === 'ghost'
              ? 'text-[#1C1917] hover:bg-[#F5F5F4] active:bg-[#E7E5E4]'
              : 'bg-[#B91C1C] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D]'
          }
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
        {typeof badge === 'number' && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-[#B91C1C] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 border-2 border-white">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
