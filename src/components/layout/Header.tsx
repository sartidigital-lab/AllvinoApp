"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { AppShareButton } from '@/components/share/AppShareButton';
import { ShoppingBag } from 'lucide-react';

export function Header() {
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 grid w-full grid-cols-[1fr_auto_1fr] items-center border-b border-stone-100 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5">
      <div className="justify-self-start">
        <AppShareButton />
      </div>
      
      <Link href="/catalogo" className="h-12 flex items-center justify-center">
        <Image src="/logo-allvino-header.png" alt="Allvino" width={144} height={48} priority className="h-auto w-36 object-contain" />
      </Link>
      
      <button
        type="button"
        aria-label={`Abrir carrinho com ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'itens'}`}
        onClick={() => setIsCartOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 justify-self-end rounded-full border border-brand-primary/20 bg-brand-primary px-3.5 text-xs font-bold text-white shadow-sm transition hover:bg-brand-primary-hover active:scale-95 sm:px-4 sm:text-sm"
      >
        <ShoppingBag className="h-5 w-5" aria-hidden="true" />
        <span>Carrinho</span>
        <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-brand-primary" aria-hidden="true">
          {cartItemCount > 99 ? '99+' : cartItemCount}
        </span>
      </button>
    </header>
  );
}
