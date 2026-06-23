'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantStyles = {
  primary:
    'bg-[#B91C1C] text-white hover:bg-[#991B1B] active:bg-[#7F1D1D] shadow-lg shadow-red-900/20',
  secondary:
    'bg-white text-[#1C1917] border border-[#E7E5E4] hover:bg-[#F9F7F4] active:bg-[#F5F5F4]',
  ghost:
    'bg-transparent text-[#57534E] hover:bg-[#F5F5F4] active:bg-[#E7E5E4]',
  danger:
    'bg-[#DC2626] text-white hover:bg-[#B91C1C] active:bg-[#991B1B]',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-xs min-h-[32px]',
  md: 'px-4 py-2.5 text-sm min-h-[40px]',
  lg: 'px-6 py-3.5 text-base min-h-[48px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`
          inline-flex items-center justify-center gap-2
          font-bold rounded-xl
          transition-all duration-150 ease-in-out
          active:scale-[0.98]
          disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
