'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CircleHelp, Heart, SearchX, ShoppingCart, Upload, Wine } from 'lucide-react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
}

const iconMap = {
  favorite: Heart,
  search_off: SearchX,
  shopping_cart: ShoppingCart,
  upload_file: Upload,
  wine_bar: Wine,
};

export function EmptyState({ icon, title, description, action, children }: EmptyStateProps) {
  const Icon = iconMap[icon as keyof typeof iconMap] || CircleHelp;

  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 bg-stone-100 rounded-full mx-auto flex items-center justify-center mb-6">
        <Icon className="h-10 w-10 text-stone-300" aria-hidden="true" />
      </div>
      <h3 className="font-serif text-lg font-bold text-stone-600">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-stone-400 max-w-xs mx-auto">{description}</p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 bg-[#B91C1C] text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-red-900/20 hover:bg-[#991B1B] active:scale-95 transition-transform"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
