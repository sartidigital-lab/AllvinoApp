"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Wine } from '@/types/database';

interface FavoritesContextType {
  favorites: Wine[];
  toggleFavorite: (wine: Wine) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
});

export function useFavorites() {
  return useContext(FavoritesContext);
}

const STORAGE_KEY = 'allvino_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Wine[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setFavorites(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isInitialized]);

  const toggleFavorite = useCallback((wine: Wine) => {
    setFavorites((prev) => {
      const exists = prev.some((w) => w.id === wine.id);
      if (exists) {
        return prev.filter((w) => w.id !== wine.id);
      }
      return [...prev, wine];
    });
  }, []);

  const isFavorite = useCallback((id: string) => {
    return favorites.some((w) => w.id === id);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}
