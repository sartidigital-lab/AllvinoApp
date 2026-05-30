import { createClient } from '@/utils/supabase/client';
import { Wine } from '@/types/database';

type LegacyProduct = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  imagem_url: string | null;
  pais: string | null;
  tipo: string | null;
  uva: string | null;
  criado_em: string;
};

function mapProductToWine(product: LegacyProduct): Wine {
  return {
    id: product.id,
    name: product.nome,
    description: product.descricao,
    price: Number(product.preco),
    image_url: product.imagem_url,
    type: product.tipo,
    region: product.pais,
    grape: product.uva,
    category: [product.pais, product.tipo].filter(Boolean).join(' • ') || 'Vinho',
    stock: 0,
    created_at: product.criado_em,
  };
}

function mapWineToProduct(wineData: Partial<Wine>) {
  return {
    nome: wineData.name,
    descricao: wineData.description,
    preco: wineData.price,
    imagem_url: wineData.image_url,
    pais: wineData.region,
    tipo: wineData.type || wineData.category,
    uva: wineData.grape,
  };
}

export async function fetchWinesFromSupabase(): Promise<Wine[]> {
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

    if (!productError && product) {
      return mapProductToWine(product as LegacyProduct);
    }

    const { data, error } = await supabase
      .from('wines')
      .insert(wineData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating wine:', error);
    return null;
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

    if (!productError && product) {
      return mapProductToWine(product as LegacyProduct);
    }

    const { data, error } = await supabase
      .from('wines')
      .update(wineData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating wine:', error);
    return null;
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
