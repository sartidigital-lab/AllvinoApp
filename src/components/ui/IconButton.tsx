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
              ? 'text-brand-ink hover:bg-stone-100 active:bg-brand-border'
              : 'bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-dark'
          }
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        <span className={iconSizes[size]}>{icon}</span>
        {typeof badge === 'number' && badge > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full border-2 border-white bg-brand-primary px-1 text-[9px] font-bold flex items-center justify-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
