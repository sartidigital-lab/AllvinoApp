"use client";

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { useState } from 'react';
import { IconButton, Button, Checkbox, EmptyState } from '@/components/ui';

export function CartOverlay() {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, cartTotal } = useCart();
  const [retirada, setRetirada] = useState(false);

  const discount = retirada ? cartTotal * 0.10 : 0;
  const finalTotal = cartTotal - discount;

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
        onClick={() => setIsCartOpen(false)}
      ></div>
      
      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">Sua Seleção</h2>
          <IconButton
            icon={<span className="material-symbols-outlined">close</span>}
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
                <img 
                  src={item.image_url || 'https://via.placeholder.com/300x400'} 
                  alt={item.name}
                  className="w-16 h-20 object-contain mix-blend-multiply"
                />
                <div className="flex-1">
                  <p className="font-bold text-sm line-clamp-2">{item.name}</p>
                  <p className="text-xs text-stone-400">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)} 
                    className="w-6 h-6 border rounded font-bold hover:bg-stone-100 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)} 
                    className="w-6 h-6 border rounded font-bold hover:bg-stone-100 flex items-center justify-center"
                  >
                    +
                  </button>
                  <button 
                    onClick={() => removeFromCart(item.id)} 
                    className="text-stone-300 hover:text-red-500 ml-1 flex items-center justify-center" 
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
          <div className="p-6 bg-stone-50 border-t space-y-4">
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
              href="/checkout" 
              onClick={() => setIsCartOpen(false)}
              className="w-full block"
            >
              <Button variant="primary" size="lg" className="w-full">
                Ir para Pagamento
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
