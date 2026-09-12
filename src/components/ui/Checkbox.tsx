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
          bg-brand-surface rounded-brand-2xl border border-brand-border
          cursor-pointer hover:border-brand-ink transition-colors
          ${className}
        `}
      >
        <div className="flex items-center gap-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="h-5 w-5 rounded border-stone-300 text-brand-primary focus:ring-0"
            {...props}
          />
          <div>
            {label && <span className="text-sm font-bold text-brand-ink">{label}</span>}
            {description && <p className="mt-0.5 text-xs text-brand-muted">{description}</p>}
          </div>
        </div>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
