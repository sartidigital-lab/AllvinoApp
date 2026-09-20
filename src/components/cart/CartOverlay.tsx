"use client";

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, EmptyState, IconButton, ProductImage } from '@/components/ui';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export function CartOverlay() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [retirada, setRetirada] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const discount = retirada ? cartTotal * 0.10 : 0;
  const finalTotal = cartTotal - discount;

  useEffect(() => {
    setIsCartOpen(false);
  }, [pathname, setIsCartOpen]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setIsAuthenticated(Boolean(session?.user));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isCartOpen) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCartOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [isCartOpen, setIsCartOpen]);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setIsCartOpen(false)}
      ></div>
      
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300"
      >
        <div className="p-6 border-b flex justify-between items-center">
          <h2 id="cart-title" className="text-xl font-bold">Sua Seleção</h2>
          <IconButton
            ref={closeButtonRef}
            icon={<X className="h-5 w-5" aria-hidden="true" />}
            aria-label="Fechar carrinho"
            onClick={() => setIsCartOpen(false)}
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
          {cart.length === 0 ? (
            <EmptyState icon="shopping_cart" title="Seu carrinho está vazio" description='Explore nosso catálogo e adicione vinhos deliciosos.' />
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex gap-4 items-center border-b pb-4">
                <ProductImage
                  src={item.image_url}
                  alt={item.name}
                  width={64}
                  height={80}
                  sizes="64px"
                  className="h-20 w-16 object-contain mix-blend-multiply"
                />
                <div className="flex-1">
                  <p className="font-bold text-sm line-clamp-2">{item.name}</p>
                  <div className="flex items-center gap-2 text-xs">
                    {item.discount_percent && item.original_price > item.price && (
                      <span className="text-stone-400 line-through">R$ {item.original_price.toFixed(2).replace('.', ',')}</span>
                    )}
                    <span className="font-bold text-[#B91C1C]">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    {item.discount_percent && <span className="rounded bg-red-50 px-1.5 py-0.5 font-black text-[#B91C1C]">-{item.discount_percent}%</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)} 
                    aria-label={`Diminuir quantidade de ${item.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border font-bold hover:bg-stone-100"
                  >
                    -
                  </button>
                  <span className="w-6 text-center text-sm font-bold" aria-label={`Quantidade: ${item.quantity}`}>{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)} 
                    aria-label={`Aumentar quantidade de ${item.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border font-bold hover:bg-stone-100"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    aria-label={`Remover ${item.name} do carrinho`}
                    className="ml-1 flex h-10 w-10 items-center justify-center text-stone-300 hover:text-red-500"
                    title="Remover"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {cart.length > 0 && (
          <div className="space-y-4 border-t bg-stone-50 px-6 pb-28 pt-6">
            <Checkbox
              label="Retirada na Loja"
              description="Ganhe 10% de desconto"
              checked={retirada}
              onChange={(e) => setRetirada(e.target.checked)}
            />
            
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span> 
              <span>R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
            </div>
            
            <Link 
              href={isAuthenticated ? '/checkout' : '/?login=true&redirectTo=/checkout'}
              onClick={() => setIsCartOpen(false)}
              className="w-full block"
            >
              <Button variant="primary" size="lg" className="w-full">
                {isAuthenticated ? 'Ir para Pagamento' : 'Entrar ou criar conta'}
              </Button>
            </Link>
            {isAuthenticated === false && (
              <p className="text-center text-xs font-medium text-stone-500">Entre ou crie sua conta para finalizar o pedido.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
