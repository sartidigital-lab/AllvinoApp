import { createClient } from '@/utils/supabase/client';
import { CatalogProduct, LegacyProduct, mapCatalogProductToWine, mapProductToWine, mapWineToProduct } from '@/lib/catalog/products';
import { Wine } from '@/types/database';

const productSelect = 'id,nome,descricao,preco,sku_sankhya,imagem_url,pais,regiao,tipo,uva,estoque,publicado,criado_em';
const catalogProductSelect = 'id,nome,descricao,base_price,effective_price,sku_sankhya,imagem_url,pais,regiao,tipo,uva,estoque,publicado,criado_em,promotion_id,promotion_title,promotion_slug,discount_percent';

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
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) return null;

  return (await response.json()) as Wine[];
}

export async function fetchWinesFromSupabase(options: { usePublicCache?: boolean; includeUnpublished?: boolean } = {}): Promise<Wine[]> {
  if (options.usePublicCache !== false) {
    const cachedCatalog = await fetchCachedPublicCatalog();
    if (cachedCatalog) {
      return cachedCatalog;
    }
  }

  const supabase = createClient();

  if (!options.includeUnpublished) {
    const { data, error } = await supabase
      .from('catalog_products')
      .select(catalogProductSelect)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('Error fetching promoted catalog from Supabase:', error);
      throw error;
    }

    return (data || []).map((product) => mapCatalogProductToWine(product as CatalogProduct));
  }

  let productsQuery = supabase
    .from('produtos')
    .select(productSelect)
    .order('criado_em', { ascending: false });

  const { data: products, error: productsError } = await productsQuery;

  if (productsError) {
    console.error('Error fetching products from Supabase:', productsError);
    throw productsError;
  }

  return (products || []).map((product) => mapProductToWine(product as LegacyProduct));
}

export async function fetchWineByIdFromSupabase(id: string): Promise<Wine | undefined> {
  const supabase = createClient();

  const { data: product, error: productError } = await supabase
    .from('catalog_products')
    .select(catalogProductSelect)
    .eq('id', id)
    .single();

  if (!productError && product) {
    return mapCatalogProductToWine(product as CatalogProduct);
  }

  if (productError?.code !== 'PGRST116') {
    console.error(`Error fetching product ${id} from Supabase:`, productError);
  }

  return undefined;
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

export async function toggleWinePublished(id: string, published: boolean): Promise<Wine | null> {
  const supabase = createClient();
  try {
    const { data: product, error: productError } = await supabase
      .from('produtos')
      .update({ publicado: published })
      .eq('id', id)
      .select()
      .single();

    if (productError) {
      throw new Error(getDatabaseErrorMessage(productError) || 'Nao foi possivel alterar a visibilidade do produto.');
    }

    if (!product) {
      throw new Error('Produto nao encontrado para atualizar visibilidade.');
    }

    return mapProductToWine(product as LegacyProduct);
  } catch (error) {
    console.error('Error toggling wine published:', error);
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

    if (productError) throw productError;
    return true;
  } catch (error) {
    console.error('Error deleting wine:', error);
    return false;
  }
}
