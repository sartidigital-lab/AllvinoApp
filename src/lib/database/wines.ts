import { createClient } from '@/utils/supabase/client';
import { LegacyProduct, mapProductToWine, mapWineToProduct } from '@/lib/catalog/products';
import { Wine } from '@/types/database';

function getDatabaseErrorMessage(error: unknown) {
  if (!error) return '';
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message?: unknown }).message || '');
  }
  return String(error);
}

async function fetchCachedPublicCatalog(): Promise<Wine[] | null> {
  if (typeof window === 'undefined') return null;

  const response = await fetch('/api/catalogo', {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  return (await response.json()) as Wine[];
}

export async function fetchWinesFromSupabase(options: { usePublicCache?: boolean } = {}): Promise<Wine[]> {
  if (options.usePublicCache !== false) {
    const cachedCatalog = await fetchCachedPublicCatalog();
    if (cachedCatalog) {
      return cachedCatalog;
    }
  }

  const supabase = createClient();

  const { data: products, error: productsError } = await supabase
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false });

  if (!productsError) {
    return (products as LegacyProduct[]).map(mapProductToWine);
  }

  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching wines from Supabase:', error);
    throw error;
  }

  return data as Wine[];
}

export async function fetchWineByIdFromSupabase(id: string): Promise<Wine | undefined> {
  const supabase = createClient();

  const { data: product, error: productError } = await supabase
    .from('produtos')
    .select('*')
    .eq('id', id)
    .single();

  if (!productError && product) {
    return mapProductToWine(product as LegacyProduct);
  }

  const { data, error } = await supabase
    .from('wines')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error(`Error fetching wine ${id} from Supabase:`, error);
    return undefined; // Or throw depending on your error handling strategy
  }

  return data as Wine;
}

export async function createWine(wineData: Partial<Wine>): Promise<Wine | null> {
  const supabase = createClient();
  try {
    const { data: product, error: productError } = await supabase
      .from('produtos')
      .insert(mapWineToProduct(wineData))
      .select()
      .single();

    if (productError) {
      throw new Error(getDatabaseErrorMessage(productError) || 'Nao foi possivel cadastrar o produto.');
    }

    if (!product) {
      throw new Error('Produto cadastrado sem retorno do banco.');
    }

    return mapProductToWine(product as LegacyProduct);
  } catch (error) {
    console.error('Error creating wine:', error);
    throw error;
  }
}

export async function updateWine(id: string, wineData: Partial<Wine>): Promise<Wine | null> {
  const supabase = createClient();
  try {
    const { data: product, error: productError } = await supabase
      .from('produtos')
      .update(mapWineToProduct(wineData))
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      throw new Error(getDatabaseErrorMessage(productError) || 'Nao foi possivel atualizar o produto.');
    }

    if (!product) {
      throw new Error('Produto atualizado sem retorno do banco.');
    }

    return mapProductToWine(product as LegacyProduct);
  } catch (error) {
    console.error('Error updating wine:', error);
    throw error;
  }
}

export async function deleteWine(id: string): Promise<boolean> {
  const supabase = createClient();
  try {
    const { error: productError } = await supabase
      .from('produtos')
      .delete()
      .eq('id', id);

    if (!productError) {
      return true;
    }

    const { error } = await supabase
      .from('wines')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting wine:', error);
    return false;
  }
}
