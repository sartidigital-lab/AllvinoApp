"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { Wine } from '@/types/database';
import { fetchWinesFromSupabase } from '@/lib/database/wines';
import { sanitizeStoredWineIds, sanitizeWine } from '@/lib/catalog/sanitizeWine';
import { AUTH_STATE_EVENT, getBrowserSession } from '@/lib/auth/browserSession';

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
    let active = true;

    const refreshUser = () => {
      void getBrowserSession()
        .then((session) => { if (active) setUserId(session?.user.id ?? null); })
        .catch(() => { if (active) setUserId(null); });
    };
    refreshUser();
    window.addEventListener(AUTH_STATE_EVENT, refreshUser);
    window.addEventListener('focus', refreshUser);

    return () => {
      active = false;
      window.removeEventListener(AUTH_STATE_EVENT, refreshUser);
      window.removeEventListener('focus', refreshUser);
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
    async function syncRemoteFavorites() {
      const localFavoriteIds = readLocalFavoriteIds();
      const remoteResponse = await fetch('/api/cliente/favoritos', { cache: 'no-store' });
      if (!remoteResponse.ok) {
        console.error('Nao foi possivel carregar favoritos sincronizados.');
        return;
      }
      const remotePayload = await remoteResponse.json() as { productIds?: string[] };

      if (localFavoriteIds.length > 0) {
        const migrationResponse = await fetch('/api/cliente/favoritos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds: localFavoriteIds }),
        });
        if (!migrationResponse.ok) {
          console.error('Nao foi possivel migrar favoritos locais.');
        }
      }

      const remoteIds = new Set(remotePayload.productIds || []);
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

    const exists = favoritesRef.current.some((w) => w.id === safeWine.id);
    const next = exists
      ? favoritesRef.current.filter((w) => w.id !== safeWine.id)
      : [...favoritesRef.current, safeWine];
    favoritesRef.current = next;
    setFavorites(next);

    if (userId) {
      void fetch('/api/cliente/favoritos', {
        method: exists ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exists ? { productId: safeWine.id } : { productIds: [safeWine.id] }),
      }).then((response) => {
        if (!response.ok) console.error('Nao foi possivel sincronizar favorito.');
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
