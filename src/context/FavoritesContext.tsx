"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Wine } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';

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
  const [userId, setUserId] = useState<string | null>(null);
  const favoritesRef = useRef<Wine[]>([]);
  const syncVersion = useRef(0);

  const readLocalFavorites = useCallback((): Wine[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? (parsed as Wine[]) : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    setFavorites(readLocalFavorites());
    setIsInitialized(true);
  }, [readLocalFavorites]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (active) setUserId(data.user?.id ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUserId(session?.user?.id ?? null);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    favoritesRef.current = favorites;
  }, [favorites]);

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
      } catch {
        // Keep the in-memory state usable when browser storage is unavailable.
      }
    }
  }, [favorites, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !userId) return;

    const version = ++syncVersion.current;
    const supabase = createClient();

    async function syncRemoteFavorites() {
      const localFavorites = readLocalFavorites();
      const { data: rows, error: rowsError } = await supabase
        .from('user_favorites')
        .select('product_id')
        .eq('user_id', userId);

      if (rowsError) {
        console.error('Nao foi possivel carregar favoritos sincronizados:', rowsError);
        return;
      }

      if (localFavorites.length > 0) {
        const { error: migrationError } = await supabase
          .from('user_favorites')
          .upsert(
            localFavorites.map((wine) => ({ user_id: userId, product_id: wine.id })),
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          );

        if (migrationError) {
          console.error('Nao foi possivel migrar favoritos locais:', migrationError);
        }
      }

      const remoteIds = new Set((rows || []).map((row) => row.product_id as string));
      localFavorites.forEach((wine) => remoteIds.add(wine.id));

      if (remoteIds.size === 0) {
        if (version === syncVersion.current) setFavorites([]);
        return;
      }

      try {
        const catalog = await fetchWinesFromSupabase();
        const synced = catalog.filter((wine) => remoteIds.has(wine.id));
        const syncedIds = new Set(synced.map((wine) => wine.id));
        const unavailableLocal = localFavorites.filter((wine) => !syncedIds.has(wine.id));

        if (version === syncVersion.current) {
          setFavorites([...synced, ...unavailableLocal]);
        }
      } catch (catalogError) {
        console.error('Nao foi possivel atualizar dados dos favoritos:', catalogError);
      }
    }

    void syncRemoteFavorites();
  }, [isInitialized, readLocalFavorites, userId]);

  const toggleFavorite = useCallback((wine: Wine) => {
    const supabase = createClient();
    const exists = favoritesRef.current.some((w) => w.id === wine.id);
    const next = exists
      ? favoritesRef.current.filter((w) => w.id !== wine.id)
      : [...favoritesRef.current, wine];
    favoritesRef.current = next;
    setFavorites(next);

    if (userId) {
      void (exists
        ? supabase.from('user_favorites').delete().eq('user_id', userId).eq('product_id', wine.id)
        : supabase.from('user_favorites').upsert(
            { user_id: userId, product_id: wine.id },
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          )
      ).then(({ error }) => {
        if (error) console.error('Nao foi possivel sincronizar favorito:', error);
      });
    }
  }, [userId]);

  const isFavorite = useCallback((id: string) => {
    return favorites.some((w) => w.id === id);
  }, [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}
