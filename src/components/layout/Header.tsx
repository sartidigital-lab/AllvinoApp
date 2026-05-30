"use client";

import Link from 'next/link';
import { useCart } from '@/context/CartContext';

export function Header() {
  const { cart, setIsCartOpen } = useCart();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-stone-100 flex justify-between items-center w-full px-5 py-4">
      <button className="p-1 opacity-0 pointer-events-none">
        <span className="material-symbols-outlined text-black">tune</span>
      </button>
      
      <Link href="/" className="h-12 flex items-center justify-center">
        <img src="/logo-allvino-header.png" alt="Allvino" className="w-36 h-auto object-contain" />
      </Link>
      
      <button 
        onClick={() => setIsCartOpen(true)} 
        className="relative p-1 hover:bg-stone-100 rounded-full transition"
      >
        <span className="material-symbols-outlined text-black">shopping_bag</span>
        {cartItemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-[#B91C1C] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold border border-white">
            {cartItemCount}
          </span>
        )}
      </button>
    </header>
  );
}
