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

  const navLinks = [
    { href: '/admin', label: 'BI Analytics', icon: 'analytics', color: 'text-[#B91C1C]' },
    { href: '/admin/pedidos', label: 'Pedidos', icon: 'receipt_long', color: 'text-emerald-400' },
    { href: '/admin/clientes', label: 'Clientes', icon: 'groups', color: 'text-pink-400' },
    { href: '/admin/catalogo', label: 'Catalogo', icon: 'wine_bar', color: 'text-blue-400' },
    { href: '/admin/estoque', label: 'Estoque', icon: 'inventory_2', color: 'text-yellow-400' },
    { href: '/admin/promocoes', label: 'Promocoes', icon: 'campaign', color: 'text-green-500' },
    { href: '/admin/logistica', label: 'Logistica', icon: 'local_shipping', color: 'text-cyan-400' },
    { href: '/admin/equipe', label: 'Equipe', icon: 'group', color: 'text-orange-400' },
    { href: '/admin/perfil', label: 'Meu Perfil', icon: 'person_edit', color: 'text-purple-400' },
  ];

  return (
    <>
      <header className="bg-[#111111] border-b border-stone-800 sticky top-0 z-40 flex justify-between items-center w-full px-5 py-4 lg:pl-72 shadow-sm text-white">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden p-1 hover:bg-stone-800 rounded-md transition-colors">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <h2 className="text-lg font-bold hidden sm:block">Gestao Allvino</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-stone-300">Ola, {userName.split(' ')[0]}</span>
          <span className="text-[10px] bg-stone-300 text-black px-2 py-0.5 rounded-full uppercase font-bold">Admin</span>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full w-64 bg-[#0a0a0a] border-r border-stone-800 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none`}>
        <div className="px-6 py-6 border-b border-stone-800 bg-[#111111] flex justify-between items-center">
          <img src="/LOGO-ALLVINO-BRANCO.png" alt="Allvino" className="h-8 object-contain" />
          <button onClick={() => setIsOpen(false)} className="lg:hidden text-stone-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link 
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`w-full flex items-center px-4 py-3 rounded-xl transition font-bold ${isActive ? 'bg-stone-800 text-white' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
              >
                <span className={`material-symbols-outlined mr-3 ${link.color}`}>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-stone-800">
          <button onClick={handleLogout} className="flex text-[#B91C1C] font-bold text-sm hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined mr-2">logout</span> Sair do Sistema
          </button>
        </div>
      </aside>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" />
      )}
    </>
  );
}
