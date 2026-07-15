"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, LayoutGrid, User } from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: Home, label: 'Início', match: pathname === '/' },
    { href: '/catalogo', icon: LayoutGrid, label: 'Catálogo', match: pathname?.startsWith('/catalogo') },
    { href: '/favoritos', icon: Heart, label: 'Favoritos', match: pathname?.startsWith('/favoritos') },
    { href: '/conta', icon: User, label: 'Conta', match: pathname?.startsWith('/conta') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 z-[70] flex w-full items-center justify-around rounded-t-2xl border-t border-stone-100 bg-white/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] backdrop-blur-md">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.match ? 'page' : undefined}
            className={`flex min-h-12 min-w-14 flex-col items-center justify-center rounded-xl transition-colors ${
              item.match ? 'font-bold text-[#B91C1C]' : 'text-stone-400 hover:text-black'
            }`}
          >
            <Icon className="mb-1 h-5 w-5" strokeWidth={item.match ? 2.6 : 2.2} aria-hidden="true" />
            <span className="mt-1 text-[9px] uppercase tracking-tighter">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
