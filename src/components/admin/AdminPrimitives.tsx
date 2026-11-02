import { ReactNode } from 'react';

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

type AdminStatCardProps = {
  label: string;
  value: ReactNode;
  icon?: string;
  tone?: 'dark' | 'default' | 'accent' | 'success' | 'warning';
};

type AdminSectionProps = {
  title: string;
  icon?: string;
  actions?: ReactNode;
  children: ReactNode;
};

type AdminNoticeProps = {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

type AdminEmptyStateProps = {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

type AdminStatusBadgeProps = {
  children: ReactNode;
  icon?: string;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
};

export function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="relative flex flex-col gap-5 border-b border-[#D9D0C4] pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-7">
      <div className="min-w-0 max-w-3xl">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[#8F1D2C]">Central de operações</p>
        <h1 className="font-serif text-[2rem] font-bold leading-[1.05] tracking-[-0.025em] text-[#1B1917] sm:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm font-bold leading-relaxed text-stone-500 sm:text-[15px]">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0 sm:justify-end">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({ label, value, icon, tone = 'default' }: AdminStatCardProps) {
  const isDark = tone === 'dark';
  const toneClass = {
    dark: 'admin-surface-dark text-white',
    default: '',
    accent: 'border-red-100/80 bg-gradient-to-br from-white to-red-50/70',
    success: 'border-emerald-100/80 bg-gradient-to-br from-white to-emerald-50/70',
    warning: 'border-amber-100/80 bg-gradient-to-br from-white to-amber-50/70',
  }[tone];
  const iconClass = {
    dark: 'border-white/10 bg-white/10 text-[#E2C28F]',
    default: 'border-stone-100 bg-stone-50 text-stone-500',
    accent: 'border-red-100 bg-red-50 text-[#8F1D2C]',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
  }[tone];

  return (
    <div className={`admin-surface group relative min-h-[126px] overflow-hidden p-4 sm:min-h-[148px] sm:p-5 ${toneClass}`}>
      {icon && (
        <span className={`material-symbols-outlined absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl border text-[19px] transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 sm:h-10 sm:w-10 sm:text-[21px] ${iconClass}`}>
          {icon}
        </span>
      )}
      <p className={`relative max-w-[calc(100%-2.75rem)] text-[9px] font-bold uppercase leading-snug tracking-[0.16em] sm:text-[10px] ${isDark ? 'text-white/55' : 'text-stone-500'}`}>{label}</p>
      <div className={`relative mt-8 text-xl font-bold leading-none tracking-[-0.03em] sm:mt-9 sm:text-[1.7rem] ${isDark ? 'text-white' : 'text-[#1B1917]'}`}>{value}</div>
      <span className={`absolute inset-x-4 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${isDark ? 'bg-[#B88A44]' : 'bg-[#8F1D2C]'}`} />
    </div>
  );
}

export function AdminSection({ title, icon, actions, children }: AdminSectionProps) {
  return (
    <section className="admin-surface p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-base font-bold text-[#1B1917] sm:text-lg">
          {icon && <span className="material-symbols-outlined flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3EAE2] text-[18px] text-[#8F1D2C]">{icon}</span>}
          {title}
        </h2>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function AdminNotice({ children, tone = 'default' }: AdminNoticeProps) {
  const toneClass = {
    default: 'border-stone-200 bg-white text-stone-700',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    danger: 'border-red-100 bg-red-50 text-red-700',
  }[tone];

  return (
    <div className={`rounded-2xl border px-4 py-3.5 text-sm font-bold shadow-sm ${toneClass}`}>
      {children}
    </div>
  );
}

export function AdminEmptyState({ icon = 'inbox', title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-[#D9D0C4] bg-[#F9F6F1]/80 px-6 py-9 text-center">
      <span className="material-symbols-outlined flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[26px] text-stone-400 shadow-sm">{icon}</span>
      <p className="mt-3 text-sm font-bold text-black">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-xs font-bold leading-relaxed text-stone-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminStatusBadge({ children, icon, tone = 'neutral', className = '' }: AdminStatusBadgeProps) {
  const toneClass = {
    neutral: 'border-stone-200 bg-stone-50 text-stone-600',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-100 bg-amber-50 text-amber-700',
    danger: 'border-red-100 bg-red-50 text-red-700',
    info: 'border-blue-100 bg-blue-50 text-blue-700',
  }[tone];

  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${toneClass} ${className}`}>
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      {children}
    </span>
  );
}
