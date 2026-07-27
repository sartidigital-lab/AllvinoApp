"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Wine } from '@/types/database';
import { createClient } from '@/utils/supabase/client';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { sanitizeStoredWineIds, sanitizeWine } from '@/lib/catalog/sanitizeWine';

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

  const readLocalFavoriteIds = useCallback((): string[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return sanitizeStoredWineIds(parsed);
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLocalFavorites() {
      const localIds = readLocalFavoriteIds();
      if (localIds.length === 0) {
        if (active) setIsInitialized(true);
        return;
      }

      try {
        const catalog = await fetchWinesFromSupabase();
        const idSet = new Set(localIds);
        if (active) setFavorites(catalog.filter((wine) => idSet.has(wine.id)));
      } catch (error) {
        console.error('Nao foi possivel carregar favoritos locais pelo catalogo:', error);
      } finally {
        if (active) setIsInitialized(true);
      }
    }

    void loadLocalFavorites();

    return () => {
      active = false;
    };
  }, [readLocalFavoriteIds]);

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.map((wine) => wine.id)));
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
    const localFavoriteIds = readLocalFavoriteIds();
      const { data: rows, error: rowsError } = await supabase
        .from('user_favorites')
        .select('product_id')
        .eq('user_id', userId);

      if (rowsError) {
        console.error('Nao foi possivel carregar favoritos sincronizados:', rowsError);
        return;
      }

      if (localFavoriteIds.length > 0) {
        const { error: migrationError } = await supabase
          .from('user_favorites')
          .upsert(
            localFavoriteIds.map((productId) => ({ user_id: userId, product_id: productId })),
            { onConflict: 'user_id,product_id', ignoreDuplicates: true }
          );

        if (migrationError) {
          console.error('Nao foi possivel migrar favoritos locais:', migrationError);
        }
      }

      const remoteIds = new Set((rows || []).map((row) => row.product_id as string));
      localFavoriteIds.forEach((productId) => remoteIds.add(productId));

      if (remoteIds.size === 0) {
        if (version === syncVersion.current) setFavorites([]);
        return;
      }

      try {
        const catalog = await fetchWinesFromSupabase();
        const synced = catalog.filter((wine) => remoteIds.has(wine.id));

        if (version === syncVersion.current) {
          setFavorites(synced);
        }
      } catch (catalogError) {
        console.error('Nao foi possivel atualizar dados dos favoritos:', catalogError);
      }
    }

    void syncRemoteFavorites();
  }, [isInitialized, readLocalFavoriteIds, userId]);

  const toggleFavorite = useCallback((wine: Wine) => {
    const safeWine = sanitizeWine(wine);
    if (!safeWine) return;

    const supabase = createClient();
    const exists = favoritesRef.current.some((w) => w.id === safeWine.id);
    const next = exists
      ? favoritesRef.current.filter((w) => w.id !== safeWine.id)
      : [...favoritesRef.current, safeWine];
    favoritesRef.current = next;
    setFavorites(next);

    if (userId) {
      void (exists
        ? supabase.from('user_favorites').delete().eq('user_id', userId).eq('product_id', safeWine.id)
        : supabase.from('user_favorites').upsert(
            { user_id: userId, product_id: safeWine.id },
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
