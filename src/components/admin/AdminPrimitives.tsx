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
  tone?: 'dark' | 'default' | 'accent';
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
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-200 pb-6">
      <div className="min-w-0">
        <h1 className="font-serif text-2xl font-bold text-black sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm font-bold text-stone-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({ label, value, icon, tone = 'default' }: AdminStatCardProps) {
  const isDark = tone === 'dark';
  const isAccent = tone === 'accent';

  return (
    <div className={`admin-surface relative overflow-hidden p-5 ${isDark ? 'border-black bg-black text-white' : ''}`}>
      {icon && (
        <span
          className={`material-symbols-outlined absolute -bottom-4 -right-3 text-[92px] ${
            isDark ? 'text-white/10' : isAccent ? 'text-red-100' : 'text-stone-100'
          }`}
        >
          {icon}
        </span>
      )}
      <p className={`relative text-[11px] font-bold uppercase ${isDark ? 'text-white/60' : 'text-stone-400'}`}>{label}</p>
      <div className={`relative mt-2 text-2xl font-bold sm:text-3xl ${isDark ? 'text-white' : 'text-black'}`}>{value}</div>
    </div>
  );
}

export function AdminSection({ title, icon, actions, children }: AdminSectionProps) {
  return (
    <section className="admin-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-black">
          {icon && <span className="material-symbols-outlined text-[20px] text-stone-500">{icon}</span>}
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
    <div className={`rounded-lg border px-4 py-3 text-sm font-bold ${toneClass}`}>
      {children}
    </div>
  );
}

export function AdminEmptyState({ icon = 'inbox', title, description, action }: AdminEmptyStateProps) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-stone-200 bg-stone-50/60 px-6 py-8 text-center">
      <span className="material-symbols-outlined text-[34px] text-stone-300">{icon}</span>
      <p className="mt-3 text-sm font-bold text-black">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs font-bold text-stone-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function AdminStatusBadge({ children, icon, tone = 'neutral', className = '' }: AdminStatusBadgeProps) {
  const toneClass = {
    neutral: 'bg-stone-100 text-stone-600',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  }[tone];

  return (
    <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${toneClass} ${className}`}>
      {icon && <span className="material-symbols-outlined text-[16px]">{icon}</span>}
      {children}
    </span>
  );
}
