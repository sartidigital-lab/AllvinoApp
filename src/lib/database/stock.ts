import { StockImport, StockLevel } from '@/types/database';
import { createClient } from '@/utils/supabase/client';

export type StockLevelInput = {
  product_code: string;
  quantity: number;
};

export type StockLevelWithProduct = StockLevel & {
  product_name: string | null;
  product_image_url: string | null;
};

const stockLevelSelect = 'product_code,quantity,updated_at,source,import_id';

export function normalizeProductCode(value: string) {
  return value.trim().toUpperCase();
}

export async function fetchStockLevels(): Promise<{
  stockLevels: StockLevelWithProduct[];
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('stock_levels')
      .select(stockLevelSelect)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    const stockLevels = (data || []) as StockLevel[];
    if (stockLevels.length === 0) {
      return { stockLevels: [], error: null };
    }

    const codes = stockLevels.map((stock) => stock.product_code);
    const { data: products } = await supabase
      .from('produtos')
      .select('sku_sankhya,nome,imagem_url')
      .in('sku_sankhya', codes);
    const productsByCode = new Map((products || []).map((product) => [product.sku_sankhya, product]));

    return {
      stockLevels: stockLevels.map((stock) => {
        const product = productsByCode.get(stock.product_code);
        return {
          ...stock,
          product_name: product?.nome || null,
          product_image_url: product?.imagem_url || null,
        };
      }),
      error: null,
    };
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    return { stockLevels: [], error: error as Error };
  }
}

export async function fetchStockImports(limit = 10): Promise<{
  imports: StockImport[];
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('stock_imports')
      .select('id,created_at,file_name,total_rows,source')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { imports: (data || []) as StockImport[], error: null };
  } catch (error) {
    console.error('Error fetching stock imports:', error);
    return { imports: [], error: error as Error };
  }
}

export async function fetchStockLevelByCode(productCode: string): Promise<{
  quantity: number | null;
  error: Error | null;
}> {
  const supabase = createClient();
  const normalizedCode = normalizeProductCode(productCode);

  if (!normalizedCode) {
    return { quantity: null, error: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_stock_levels_for_codes', {
      p_codes: [normalizedCode],
    });

    if (error) throw error;

    const stockLevel = (data || []).find((stock) => stock.product_code === normalizedCode);
    return {
      quantity: typeof stockLevel?.quantity === 'number' ? stockLevel.quantity : null,
      error: null,
    };
  } catch (error) {
    console.error('Error fetching stock level by code:', error);
    return { quantity: null, error: error as Error };
  }
}

export async function fetchStockLevelsByCodes(productCodes: string[]): Promise<{
  stockByCode: Map<string, number>;
  error: Error | null;
}> {
  const supabase = createClient();
  const normalizedCodes = Array.from(
    new Set(productCodes.map(normalizeProductCode).filter(Boolean))
  );

  if (normalizedCodes.length === 0) {
    return { stockByCode: new Map(), error: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_stock_levels_for_codes', {
      p_codes: normalizedCodes,
    });

    if (error) throw error;

    return {
      stockByCode: new Map((data || []).map((stock) => [stock.product_code, stock.quantity])),
      error: null,
    };
  } catch (error) {
    console.error('Error fetching stock levels by codes:', error);
    return { stockByCode: new Map(), error: error as Error };
  }
}

export async function saveManualStockLevel(input: StockLevelInput): Promise<{
  stockLevel: StockLevel | null;
  error: Error | null;
}> {
  return upsertStockLevels([input], { source: 'manual' });
}

export async function importStockLevels(
  rows: StockLevelInput[],
  fileName: string
): Promise<{ count: number; error: Error | null }> {
  const supabase = createClient();

  try {
    if (rows.length === 0) {
      throw new Error('Nenhuma linha valida para importar.');
    }

    const { data: stockImport, error: importError } = await supabase
      .from('stock_imports')
      .insert({
        file_name: fileName,
        total_rows: rows.length,
        source: 'excel',
      })
      .select('id')
      .single();

    if (importError) throw importError;

    const { error } = await upsertStockRows(rows, {
      source: 'excel',
      importId: stockImport.id,
    });

    if (error) throw error;

    return { count: rows.length, error: null };
  } catch (error) {
    console.error('Error importing stock levels:', error);
    return { count: 0, error: error as Error };
  }
}

async function upsertStockLevels(
  rows: StockLevelInput[],
  options: { source: string; importId?: string | null }
): Promise<{ stockLevel: StockLevel | null; error: Error | null }> {
  const { data, error } = await upsertStockRows(rows, options);
  return {
    stockLevel: data?.[0] || null,
    error,
  };
}

async function upsertStockRows(
  rows: StockLevelInput[],
  options: { source: string; importId?: string | null }
): Promise<{ data: StockLevel[] | null; error: Error | null }> {
  const supabase = createClient();
  const normalizedRows = rows
    .map((row) => ({
      product_code: normalizeProductCode(row.product_code),
      quantity: Math.max(0, Math.trunc(Number(row.quantity || 0))),
      source: options.source,
      import_id: options.importId || null,
      updated_at: new Date().toISOString(),
    }))
    .filter((row) => row.product_code);

  try {
    if (normalizedRows.length === 0) {
      throw new Error('Nenhuma linha valida para salvar.');
    }

    const { data, error } = await supabase
      .from('stock_levels')
      .upsert(normalizedRows, { onConflict: 'product_code' })
      .select(stockLevelSelect);

    if (error) throw error;

    for (const row of normalizedRows) {
      await supabase
        .from('produtos')
        .update({ estoque: row.quantity })
        .eq('sku_sankhya', row.product_code);
    }

    return { data: (data || []) as StockLevel[], error: null };
  } catch (error) {
    console.error('Error upserting stock levels:', error);
    return { data: null, error: error as Error };
  }
}
