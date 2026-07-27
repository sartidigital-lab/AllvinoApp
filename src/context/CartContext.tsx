"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Wine } from '@/types/database';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { getMaxCartQuantity, sanitizeCartItems, sanitizeStoredCartItems, sanitizeWine, StoredCartItem } from '@/lib/catalog/sanitizeWine';

export type CartItem = Wine & { quantity: number };

type CartContextType = {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addToCart: (wine: Wine) => void;
  addManyToCart: (items: CartItem[]) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);
const STORAGE_KEY = 'allvino_cart';

function toStoredCartItems(cart: CartItem[]): StoredCartItem[] {
  return cart.map((item) => ({
    id: item.id,
    quantity: item.quantity,
  }));
}

function hydrateCartItems(storedItems: StoredCartItem[], catalog: Wine[]): CartItem[] {
  const catalogById = new Map(catalog.map((wine) => [wine.id, wine]));

  return storedItems.flatMap((storedItem) => {
    const wine = catalogById.get(storedItem.id);
    if (!wine) return [];

    const maxQuantity = wine.stock > 0 ? Math.min(wine.stock, getMaxCartQuantity()) : getMaxCartQuantity();
    return [{ ...wine, quantity: Math.min(maxQuantity, storedItem.quantity) }];
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadCart() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const storedItems = saved ? sanitizeStoredCartItems(JSON.parse(saved)) : [];

        if (storedItems.length === 0) {
          return;
        }

        const catalog = await fetchWinesFromSupabase();
        if (active) setCart(hydrateCartItems(storedItems, catalog));
      } catch (e) {
        console.error('Failed to load cart from localStorage', e);
      } finally {
        if (active) setIsInitialized(true);
      }
    }

    void loadCart();

    return () => {
      active = false;
    };
  }, []);

  // Save to localStorage when cart changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStoredCartItems(cart)));
      } catch {
        // Keep the in-memory cart usable when browser storage is unavailable.
      }
    }
  }, [cart, isInitialized]);

  const addToCart = (wine: Wine) => {
    const safeWine = sanitizeWine(wine);
    if (!safeWine) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === safeWine.id);
      if (existing) {
        const maxQuantity = safeWine.stock > 0 ? Math.min(safeWine.stock, getMaxCartQuantity()) : getMaxCartQuantity();
        return prev.map((item) =>
          item.id === safeWine.id ? { ...item, quantity: Math.min(maxQuantity, item.quantity + 1) } : item
        );
      }
      return [...prev, { ...safeWine, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const addManyToCart = (items: CartItem[]) => {
    setCart((prev) => {
      const next = [...prev];

      sanitizeCartItems(items).forEach((item) => {
        const existingIndex = next.findIndex((cartItem) => cartItem.id === item.id);
        const maxQuantity = item.stock > 0 ? Math.min(item.stock, getMaxCartQuantity()) : getMaxCartQuantity();

        if (existingIndex >= 0) {
          next[existingIndex] = {
            ...next[existingIndex],
            quantity: Math.min(maxQuantity, next[existingIndex].quantity + item.quantity),
          };
          return;
        }

        next.push({ ...item, quantity: Math.min(maxQuantity, item.quantity) });
      });

      return next;
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const maxQuantity = item.stock > 0 ? Math.min(item.stock, getMaxCartQuantity()) : getMaxCartQuantity();
          const newQuantity = Math.min(maxQuantity, Math.max(0, item.quantity + delta));
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        addManyToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
