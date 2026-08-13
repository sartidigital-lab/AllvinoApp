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
const STOCK_PAGE_SIZE = 500;
const PRODUCT_LOOKUP_CHUNK_SIZE = 200;

export function normalizeProductCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function getCell(row: Record<string, unknown>, candidates: string[]) {
  const entry = Object.entries(row).find(([key]) => {
    const normalizedKey = normalizeHeader(key);
    return candidates.some((candidate) => (
      normalizedKey === candidate ||
      (candidate.length >= 8 && normalizedKey.startsWith(candidate))
    ));
  });
  return entry?.[1];
}

function parseQuantity(value: unknown) {
  if (typeof value === 'number') return Math.trunc(value);
  const normalized = String(value || '')
    .trim()
    .replace(/\./g, '')
    .replace(',', '.');
  return Math.trunc(Number(normalized || 0));
}

export function parseStockRows(rows: Record<string, unknown>[]): StockLevelInput[] {
  const parsedRows = rows
    .map((row) => {
      const code = getCell(row, [
        'codigo', 'cod', 'codigoproduto', 'codigodoproduto', 'codproduto',
        'codprod', 'codigointerno', 'sku', 'skuproduto', 'produto',
        'idproduto', 'referencia', 'ref', 'ean',
      ]);
      const quantity = getCell(row, [
        'quantidade', 'quantidadeemestoque', 'quantidadeestoque', 'qtd', 'qtde', 'qtdestoque',
        'estoque', 'estoqueatual', 'estoquedisponivel', 'saldo',
        'saldoatual', 'saldoestoque', 'saldodisponivel', 'disponivel',
      ]);

      return {
        product_code: normalizeProductCode(String(code || '')),
        quantity: parseQuantity(quantity),
      };
    })
    .filter((row) => row.product_code && Number.isFinite(row.quantity) && row.quantity >= 0);

  const rowsByCode = new Map<string, StockLevelInput>();
  parsedRows.forEach((row) => rowsByCode.set(row.product_code, row));
  return [...rowsByCode.values()];
}

export async function fetchStockLevels(): Promise<{
  stockLevels: StockLevelWithProduct[];
  error: Error | null;
}> {
  const supabase = createClient();

  try {
    const stockLevels: StockLevel[] = [];
    for (let offset = 0; ; offset += STOCK_PAGE_SIZE) {
      const { data, error } = await supabase
        .from('stock_levels')
        .select(stockLevelSelect)
        .order('updated_at', { ascending: false })
        .range(offset, offset + STOCK_PAGE_SIZE - 1);

      if (error) throw error;
      const page = (data || []) as StockLevel[];
      stockLevels.push(...page);
      if (page.length < STOCK_PAGE_SIZE) break;
    }

    if (stockLevels.length === 0) {
      return { stockLevels: [], error: null };
    }

    const codes = stockLevels.map((stock) => stock.product_code);
    const products: { sku_sankhya: string | null; nome: string; imagem_url: string | null }[] = [];
    for (let index = 0; index < codes.length; index += PRODUCT_LOOKUP_CHUNK_SIZE) {
      const { data, error } = await supabase
        .from('produtos')
        .select('sku_sankhya,nome,imagem_url')
        .in('sku_sankhya', codes.slice(index, index + PRODUCT_LOOKUP_CHUNK_SIZE));

      if (error) throw error;
      products.push(...(data || []));
    }
    const productsByCode = new Map(products.map((product) => [product.sku_sankhya, product]));

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
  const supabase = createClient();
  const productCode = normalizeProductCode(input.product_code);
  const quantity = Math.trunc(Number(input.quantity));

  try {
    if (!productCode || !Number.isFinite(quantity) || quantity < 0) {
      throw new Error('Codigo ou quantidade de estoque invalida.');
    }

    const { data, error } = await supabase.rpc('set_manual_stock_level', {
      p_product_code: productCode,
      p_quantity: quantity,
    });

    if (error) throw error;

    return { stockLevel: data as StockLevel, error: null };
  } catch (error) {
    console.error('Error saving manual stock level:', error);
    return { stockLevel: null, error: error as Error };
  }
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

    const source = fileName.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';
    const { data, error } = await supabase.rpc('import_stock_levels_atomic', {
      p_file_name: fileName,
      p_source: source,
      p_rows: rows,
    });

    if (error) throw error;

    return { count: Number(data || rows.length), error: null };
  } catch (error) {
    console.error('Error importing stock levels:', error);
    return { count: 0, error: error as Error };
  }
}
