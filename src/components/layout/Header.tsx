"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { AppShareButton } from '@/components/share/AppShareButton';
import { Heart, LayoutGrid, ShoppingBag, Ticket, User } from 'lucide-react';

export function Header() {
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const desktopLinks = [
    { href: '/catalogo', label: 'Catálogo', icon: LayoutGrid },
    { href: '/favoritos', label: 'Favoritos', icon: Heart },
    { href: '/cupons', label: 'Cupons', icon: Ticket },
    { href: '/conta', label: 'Conta', icon: User },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 grid w-full grid-cols-[1fr_auto_1fr] items-center border-b border-stone-100 bg-white/90 px-4 py-3 backdrop-blur-md sm:px-5 lg:hidden">
      <div className="justify-self-start">
        <AppShareButton />
      </div>
      
      <Link href="/catalogo" aria-label="Allvino — ir para o catálogo" className="h-12 flex items-center justify-center">
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

      <header className="sticky top-0 z-40 hidden border-b border-stone-200 bg-white/95 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-8 px-8">
          <Link href="/catalogo" className="shrink-0" aria-label="Allvino — ir para o catálogo">
            <Image src="/logo-allvino-header.png" alt="Allvino" width={144} height={48} priority className="h-auto w-36 object-contain" />
          </Link>
          <nav className="flex min-w-0 flex-1 items-center gap-1" aria-label="Navegação principal">
            {desktopLinks.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-brand-primary">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <AppShareButton />
            <button type="button" aria-label={`Abrir carrinho com ${cartItemCount} ${cartItemCount === 1 ? 'item' : 'itens'}`} onClick={() => setIsCartOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-primary px-5 text-sm font-bold text-white shadow-sm transition hover:bg-brand-primary-hover active:scale-95">
              <ShoppingBag className="h-5 w-5" aria-hidden="true" />
              Carrinho
              <span className="flex min-h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-brand-primary" aria-hidden="true">{cartItemCount > 99 ? '99+' : cartItemCount}</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
