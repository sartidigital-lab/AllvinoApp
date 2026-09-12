"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/context/CartContext';
import { IconButton } from '@/components/ui';
import { AppShareButton } from '@/components/share/AppShareButton';
import { ShoppingBag } from 'lucide-react';

export function Header() {
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-100 flex justify-between items-center w-full px-5 py-4">
      <AppShareButton />
      
      <Link href="/catalogo" className="h-12 flex items-center justify-center">
        <Image src="/logo-allvino-header.png" alt="Allvino" width={144} height={48} priority className="h-auto w-36 object-contain" />
      </Link>
      
      <IconButton
        icon={<ShoppingBag className="h-5 w-5" aria-hidden="true" />}
        aria-label="Abrir carrinho"
        badge={cartItemCount}
        onClick={() => setIsCartOpen(true)}
      />
    </header>
  );
}
