"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Wine } from '@/types/database';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { sanitizeStoredWineIds, sanitizeWine } from '@/lib/catalog/sanitizeWine';

interface RecentlyViewedContextType {
  recentlyViewed: Wine[];
  trackView: (wine: Wine) => void;
  clearRecentlyViewed: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType>({
  recentlyViewed: [],
  trackView: () => {},
  clearRecentlyViewed: () => {},
});

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}

const STORAGE_KEY = 'allvino_recently_viewed';
const MAX_ITEMS = 20;

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<Wine[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadRecentlyViewed() {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const storedIds = saved ? sanitizeStoredWineIds(JSON.parse(saved), MAX_ITEMS) : [];

        if (storedIds.length > 0) {
          const catalog = await fetchWinesFromSupabase();
          const catalogById = new Map(catalog.map((wine) => [wine.id, wine]));
          const hydrated = storedIds.flatMap((id) => {
            const wine = catalogById.get(id);
            return wine ? [wine] : [];
          });

          if (active) setRecentlyViewed(hydrated);
        }
      } catch (error) {
        console.error('Nao foi possivel carregar vistos recentemente pelo catalogo:', error);
      } finally {
        if (active) setIsInitialized(true);
      }
    }

    void loadRecentlyViewed();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed.map((wine) => wine.id)));
      } catch {
        // Keep the in-memory list usable when browser storage is unavailable.
      }
    }
  }, [recentlyViewed, isInitialized]);

  const trackView = useCallback((wine: Wine) => {
    const safeWine = sanitizeWine(wine);
    if (!safeWine) return;

    setRecentlyViewed((prev) => {
      const filtered = prev.filter((w) => w.id !== safeWine.id);
      return [safeWine, ...filtered].slice(0, MAX_ITEMS);
    });
  }, []);

  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentlyViewed, trackView, clearRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}
