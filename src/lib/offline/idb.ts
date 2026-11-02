import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Wine } from '@/types/database';

interface AllvinoDB extends DBSchema {
  wines: {
    key: string;
    value: Wine;
  };
}

let dbPromise: Promise<IDBPDatabase<AllvinoDB>> | null = null;

export function initDB() {
  if (typeof window === 'undefined') return null; // Avoid running on the server
  
  if (!dbPromise) {
    dbPromise = openDB<AllvinoDB>('allvino-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('wines')) {
          db.createObjectStore('wines', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheWines(wines: Wine[]): Promise<void> {
  const db = await initDB();
  if (!db) return;

  const tx = db.transaction('wines', 'readwrite');
  const store = tx.objectStore('wines');
  
  // Clear existing items to avoid stale data (optional, depends on caching strategy)
  await store.clear();
  
  // Put all new items
  const putPromises = wines.map(wine => store.put(wine));
  await Promise.all([...putPromises, tx.done]);
}

export async function getCachedWines(): Promise<Wine[]> {
  const db = await initDB();
  if (!db) return [];
  return db.getAll('wines');
}

export async function getCachedWineById(id: string): Promise<Wine | undefined> {
  const db = await initDB();
  if (!db) return undefined;
  return db.get('wines', id);
}
