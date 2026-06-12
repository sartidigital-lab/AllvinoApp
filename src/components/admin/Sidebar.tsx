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

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/?login=true');
  };

  const navGroups = [
    {
      label: 'Operação',
      links: [
        { href: '/admin', label: 'BI Analytics', icon: 'analytics', color: 'text-[#B91C1C]' },
        { href: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long', color: 'text-emerald-400' },
        { href: '/admin/conversas', label: 'Conversas', icon: 'chat', color: 'text-lime-400' },
      ],
    },
    {
      label: 'Relacionamento',
      links: [
        { href: '/admin/crm', label: 'CRM Kanban', icon: 'view_kanban', color: 'text-violet-400' },
        { href: '/admin/clientes', label: 'Clientes', icon: 'groups', color: 'text-pink-400' },
      ],
    },
    {
      label: 'Gestão',
      links: [
        { href: '/admin/catalogo', label: 'Catálogo', icon: 'wine_bar', color: 'text-blue-400' },
        { href: '/admin/estoque', label: 'Estoque', icon: 'inventory_2', color: 'text-yellow-400' },
        { href: '/admin/promocoes', label: 'Promoções', icon: 'campaign', color: 'text-green-500' },
        { href: '/admin/logistica', label: 'Logística', icon: 'local_shipping', color: 'text-cyan-400' },
        { href: '/admin/equipe', label: 'Equipe', icon: 'group', color: 'text-orange-400' },
        { href: '/admin/perfil', label: 'Meu Perfil', icon: 'person_edit', color: 'text-purple-400' },
      ],
    },
  ];
  const flatLinks = navGroups.flatMap((group) => group.links);
  const activeLink = flatLinks.find((link) => (
    link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href)
  ));

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full items-center justify-between border-b border-stone-800 bg-[#111111] px-4 py-3 text-white shadow-sm sm:px-5 lg:pl-72">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="admin-button flex h-10 w-10 items-center justify-center hover:bg-stone-800 lg:hidden"
            aria-label={isOpen ? 'Fechar menu administrativo' : 'Abrir menu administrativo'}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold sm:text-lg">Gestão Allvino</h2>
            <p className="hidden text-xs font-bold text-stone-500 sm:block">{activeLink?.label || 'Painel administrativo'}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="truncate text-sm font-bold text-stone-300">Olá, {userName.split(' ')[0]}</span>
          <span className="rounded-full bg-stone-300 px-2 py-0.5 text-[10px] font-bold uppercase text-black">Admin</span>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[86vw] transform flex-col border-r border-stone-800 bg-[#0a0a0a] shadow-2xl transition-transform duration-300 ease-in-out lg:w-64 lg:translate-x-0 lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between border-b border-stone-800 bg-[#111111] px-5 py-5">
          <img src="/LOGO-ALLVINO-BRANCO.png" alt="Allvino" className="h-7 object-contain" />
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="admin-button flex h-10 w-10 items-center justify-center text-stone-400 hover:bg-stone-800 lg:hidden"
            aria-label="Fechar menu administrativo"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <nav className="admin-scrollbar flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-3 text-[10px] font-bold uppercase text-stone-600">{group.label}</p>
              {group.links.map((link) => {
                const isActive = link.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-11 w-full items-center rounded-lg px-3 py-2.5 text-sm font-bold transition ${
                      isActive ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-900 hover:text-white'
                    }`}
                  >
                    <span className={`material-symbols-outlined mr-3 text-[20px] ${link.color}`}>{link.icon}</span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-stone-800 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="admin-button flex w-full items-center justify-center border border-red-950/70 text-sm text-[#F87171] hover:bg-red-950/30"
          >
            <span className="material-symbols-outlined mr-2">logout</span> Sair do Sistema
          </button>
        </div>
      </aside>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden" />
      )}
    </>
  );
}
