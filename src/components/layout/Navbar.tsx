"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: 'home', label: 'Início', match: pathname === '/' },
    { href: '/catalogo', icon: 'apps', label: 'Catálogo', match: pathname?.startsWith('/catalogo') },
    { href: '/favoritos', icon: 'favorite', label: 'Favoritos', match: pathname?.startsWith('/favoritos') },
    { href: '/conta', icon: 'person', label: 'Conta', match: pathname?.startsWith('/conta') },
  ];

  return (
    <nav className="bg-white/90 backdrop-blur-md fixed bottom-0 left-0 w-full z-40 rounded-t-2xl border-t border-stone-100 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] flex justify-around items-center px-4 pb-6 pt-3">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center transition-colors ${
            item.match ? 'text-[#B91C1C] font-bold' : 'text-stone-400 hover:text-black'
          }`}
        >
          <span className="material-symbols-outlined mb-1">{item.icon}</span>
          <span className="text-[9px] uppercase tracking-tighter mt-1">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
