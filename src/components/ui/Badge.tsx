import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variantStyles = {
  default: 'bg-[#F5F5F4] text-[#57534E]',
  primary: 'bg-[#B91C1C] text-white',
  success: 'bg-[#F0FDF4] text-[#16A34A]',
  warning: 'bg-[#FFFBEB] text-[#D97706]',
  danger: 'bg-[#FEF2F2] text-[#DC2626]',
  info: 'bg-[#EFF6FF] text-[#2563EB]',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ children, variant = 'default', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-bold rounded-full
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
