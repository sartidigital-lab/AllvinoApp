const storageKey = 'allvino:catalog-return';

export type CatalogReturn = {
  href: string;
  productId: string;
  search: string;
  sortBy: string;
  price: number | null;
  type: string;
  grape: string;
  country: string;
  region: string;
  limits: Record<string, number>;
  top: number;
  row?: { id: string; top: number; left: number };
};

export function saveCatalogReturn(state: CatalogReturn) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Returning to the standard catalog still works when storage is disabled.
  }
}

export function readCatalogReturn(): CatalogReturn | null {
  try {
    const state = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') as CatalogReturn | null;
    return state && /^\/catalogo(?:[?#]|$)/.test(state.href) ? state : null;
  } catch {
    return null;
  }
}

export function clearCatalogReturn() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // The browser may block session storage.
  }
}
