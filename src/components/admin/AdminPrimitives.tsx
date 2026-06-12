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
  children: ReactNode;
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

export function AdminSection({ title, icon, children }: AdminSectionProps) {
  return (
    <section className="admin-surface p-5">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-black">
        {icon && <span className="material-symbols-outlined text-[20px] text-stone-500">{icon}</span>}
        {title}
      </h2>
      {children}
    </section>
  );
}
