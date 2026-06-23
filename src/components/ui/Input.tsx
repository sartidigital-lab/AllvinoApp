'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-bold text-[#1C1917] mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5
            bg-white border rounded-xl
            text-sm text-[#1C1917] placeholder-[#A8A29E]
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#B91C1C] focus:border-[#B91C1C]
            ${error ? 'border-[#DC2626] focus:ring-[#DC2626] focus:border-[#DC2626]' : 'border-[#E7E5E4] hover:border-[#D6D3D1]'}
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-[#DC2626] font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
