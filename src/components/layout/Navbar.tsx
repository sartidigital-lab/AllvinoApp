"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white/90 backdrop-blur-md fixed bottom-0 left-0 w-full z-40 rounded-t-2xl border-t border-stone-100 shadow-[0_-10px_30px_rgba(0,0,0,0.04)] flex justify-around items-center px-6 pb-6 pt-3">
      <Link href="/" className={`flex flex-col items-center transition-colors ${pathname === '/' ? 'text-[#B91C1C] font-bold' : 'text-stone-400 hover:text-black'}`}>
        {/* Usando ícones unicode ou lucide-react para simplicidade, aqui usamos unicode simples ou texto, 
            idealmente teríamos lucide-react (instalado no package.json: "lucide-react") */}
        <span className="material-symbols-outlined mb-1">home</span>
        <span className="text-[10px] uppercase tracking-tighter mt-1">Início</span>
      </Link>
      
      <Link href="/catalogo" className={`flex flex-col items-center transition-colors ${pathname?.startsWith('/catalogo') ? 'text-[#B91C1C] font-bold' : 'text-stone-400 hover:text-black'}`}>
        <span className="material-symbols-outlined mb-1">apps</span>
        <span className="text-[10px] uppercase tracking-tighter mt-1">Catálogo</span>
      </Link>
      
      <Link href="/conta" className={`flex flex-col items-center transition-colors ${pathname?.startsWith('/conta') ? 'text-[#B91C1C] font-bold' : 'text-stone-400 hover:text-black'}`}>
        <span className="material-symbols-outlined mb-1">person</span>
        <span className="text-[10px] uppercase tracking-tighter mt-1">Conta</span>
      </Link>
    </nav>
  );
}
