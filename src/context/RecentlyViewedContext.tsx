"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Wine } from '@/types/database';

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
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setRecentlyViewed(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentlyViewed));
    }
  }, [recentlyViewed, isInitialized]);

  const trackView = useCallback((wine: Wine) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((w) => w.id !== wine.id);
      return [wine, ...filtered].slice(0, MAX_ITEMS);
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
