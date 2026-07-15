import { useState, useEffect } from 'react';
import { Wine } from '@/types/database';
import { fetchWinesFromSupabase, fetchWineByIdFromSupabase } from '@/lib/database/wines';
import { cacheWines, getCachedWines, getCachedWineById } from '@/lib/offline/idb';

export function useWines() {
  const [wines, setWines] = useState<Wine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadWines() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWinesFromSupabase();
        if (!isActive) return;
        setWines(data);
        setIsOffline(false);
        // Cache data for offline use
        await cacheWines(data);
      } catch (err) {
        console.error('Failed to fetch from Supabase, falling back to cache', err);
        setIsOffline(true);
        try {
          const cachedData = await getCachedWines();
          if (!isActive) return;
          setWines(cachedData);
        } catch (cacheErr) {
          setError(cacheErr as Error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadWines();

    return () => {
      isActive = false;
    };
  }, []);

  return { wines, isLoading, isOffline, error };
}

export function useWine(id: string) {
  const [wine, setWine] = useState<Wine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) return;
    let isActive = true;

    async function loadWine() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchWineByIdFromSupabase(id);
        if (!isActive) return;
        if (data) {
          setWine(data);
        } else {
          setWine(null);
        }
        setIsOffline(false);
      } catch (err) {
        console.error(`Failed to fetch wine ${id} from Supabase, falling back to cache`, err);
        setIsOffline(true);
        try {
          const cachedData = await getCachedWineById(id);
          if (!isActive) return;
          if (cachedData) {
            setWine(cachedData);
          } else {
            setWine(null);
          }
        } catch (cacheErr) {
          setError(cacheErr as Error);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadWine();

    return () => {
      isActive = false;
    };
  }, [id]);

  return { wine, isLoading, isOffline, error };
}
