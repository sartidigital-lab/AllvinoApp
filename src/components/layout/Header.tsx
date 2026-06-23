"use client";

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { IconButton } from '@/components/ui';
import { Badge } from '@/components/ui';

export function Header() {
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-100 flex justify-between items-center w-full px-5 py-4">
      <div className="w-10" />
      
      <Link href="/catalogo" className="h-12 flex items-center justify-center">
        <img src="/logo-allvino-header.png" alt="Allvino" className="w-36 h-auto object-contain" />
      </Link>
      
      <IconButton
        icon={<span className="material-symbols-outlined">shopping_bag</span>}
        aria-label="Abrir carrinho"
        badge={cartItemCount}
        onClick={() => setIsCartOpen(true)}
      />
    </header>
  );
}
