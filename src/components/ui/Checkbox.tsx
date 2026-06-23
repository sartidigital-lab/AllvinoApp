'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <label
        htmlFor={checkboxId}
        className={`
          flex items-center justify-between p-4
          bg-white rounded-2xl border border-[#E7E5E4]
          cursor-pointer hover:border-[#1C1917] transition-colors
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="w-5 h-5 text-[#B91C1C] rounded focus:ring-0 border-[#D6D3D1]"
            {...props}
          />
          <div>
            {label && <span className="font-bold text-sm text-[#1C1917]">{label}</span>}
            {description && <p className="text-xs text-[#78716C] mt-0.5">{description}</p>}
          </div>
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
