"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.nome_completo || 'Admin');
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/?login=true');
  };

  const navGroups = [
    {
      label: 'Operação',
      links: [
        { href: '/admin', label: 'Visão geral', icon: 'space_dashboard' },
        { href: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long' },
        { href: '/admin/conversas', label: 'Conversas', icon: 'chat' },
      ],
    },
    {
      label: 'Relacionamento',
      links: [
        { href: '/admin/crm', label: 'CRM Kanban', icon: 'view_kanban' },
        { href: '/admin/clientes', label: 'Clientes', icon: 'groups' },
      ],
    },
    {
      label: 'Gestão',
      links: [
        { href: '/admin/catalogo', label: 'Catálogo', icon: 'wine_bar' },
        { href: '/admin/estoque', label: 'Estoque', icon: 'inventory_2' },
        { href: '/admin/promocoes', label: 'Promoções', icon: 'campaign' },
        { href: '/admin/logistica', label: 'Logística', icon: 'local_shipping' },
        { href: '/admin/equipe', label: 'Equipe', icon: 'group' },
        { href: '/admin/perfil', label: 'Meu Perfil', icon: 'person_edit' },
      ],
    },
  ];
  const flatLinks = navGroups.flatMap((group) => group.links);
  const activeLink = flatLinks.find((link) => (
    link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href)
  ));
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const mobileLinks = [
    flatLinks.find((link) => link.href === '/admin'),
    flatLinks.find((link) => link.href === '/admin/pedidos'),
    flatLinks.find((link) => link.href === '/admin/catalogo'),
  ].filter((link): link is NonNullable<typeof link> => Boolean(link));

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-white/5 bg-[#171513]/95 px-4 text-white shadow-[0_8px_30px_rgba(23,21,19,0.12)] backdrop-blur-xl sm:px-6 lg:h-[72px] lg:pl-[19.5rem] lg:pr-9">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="admin-button flex h-10 w-10 shrink-0 items-center justify-center border border-white/10 bg-white/5 hover:bg-white/10 lg:hidden"
            aria-label={isOpen ? 'Fechar menu administrativo' : 'Abrir menu administrativo'}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="min-w-0 leading-tight">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.22em] text-[#C8A56A] sm:block">Central de operações</p>
            <h2 className="truncate text-sm font-bold sm:mt-1 sm:text-base">{activeLink?.label || 'Painel administrativo'}</h2>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-bold text-white">{userName}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">Administrador</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#C8A56A]/30 bg-[#C8A56A]/10 text-xs font-bold text-[#E0C391]">
            {initials || 'AD'}
          </div>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[88vw] transform flex-col border-r border-white/5 bg-[#12110F] shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[88px] items-center justify-between border-b border-white/5 px-6">
          <div>
            <div className="flex items-center gap-2" aria-label="Allvino">
              <span className="font-serif text-xl font-bold tracking-[0.08em] text-white">ALLVINO</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#9F2636] shadow-[0_0_0_4px_rgba(159,38,54,0.12)]" />
            </div>
            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.28em] text-stone-600">Management suite</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="admin-button flex h-10 w-10 items-center justify-center border border-white/10 text-stone-400 hover:bg-white/10 lg:hidden"
            aria-label="Fechar menu administrativo"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <nav className="admin-scrollbar flex-1 space-y-7 overflow-y-auto px-4 py-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="px-3 pb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-stone-600">{group.label}</p>
              {group.links.map((link) => {
                const isActive = link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex min-h-11 w-full items-center rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                      isActive ? 'bg-white/[0.09] text-white shadow-inner' : 'text-stone-500 hover:bg-white/[0.04] hover:text-stone-200'
                    }`}
                  >
                    {isActive && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-[#B88A44]" />}
                    <span className={`material-symbols-outlined mr-3 text-[20px] transition ${isActive ? 'text-[#D2AD70]' : 'text-stone-600 group-hover:text-stone-400'}`}>{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/5 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="admin-button flex w-full items-center justify-center border border-white/[0.08] bg-white/[0.03] text-sm text-stone-400 hover:border-red-900/40 hover:bg-red-950/20 hover:text-red-300"
          >
            <span className="material-symbols-outlined mr-2">logout</span> Sair do Sistema
          </button>
        </div>
      </aside>

      {isOpen && (
        <button type="button" aria-label="Fechar menu administrativo" onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm transition-opacity lg:hidden" />
      )}

      <nav aria-label="Navegação rápida" className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-[22px] border border-white/10 bg-[#171513]/95 p-1.5 text-white shadow-[0_18px_50px_rgba(23,21,19,0.28)] backdrop-blur-xl lg:hidden">
        {mobileLinks.map((link) => {
          const isActive = link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href);
          return (
            <Link key={link.href} href={link.href} aria-current={isActive ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold ${isActive ? 'bg-white/10 text-[#E0C391]' : 'text-stone-500'}`}>
              <span className="material-symbols-outlined text-[21px]">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setIsOpen(true)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold ${isOpen ? 'bg-white/10 text-[#E0C391]' : 'text-stone-500'}`}>
          <span className="material-symbols-outlined text-[21px]">apps</span>
          <span>Mais</span>
        </button>
      </nav>
    </>
  );
}
