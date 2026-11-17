import type { Wine } from '@/types/database';
import type { KitItem } from '@/lib/kits/composition';

export type KitCompositionRecord = KitItem & {
  kit_id: string;
};

export type KitRecord = {
  id: string;
  nome: string;
  descricao: string | null;
  preco_original: number | null;
  preco: number;
  sku_sankhya: string | null;
  estoque: number;
  imagem_url: string | null;
  publicado: boolean;
  product_kit_items: KitItem[];
};

type KitRecordBase = Omit<KitRecord, 'product_kit_items'>;

/**
 * Attaches each composition row to its owning Kit. Keeping this join local
 * avoids PostgREST's ambiguous relationship between the two product foreign
 * keys in product_kit_items.
 */
export function attachKitItems<T extends { id: string }>(kits: T[], composition: KitCompositionRecord[]): Array<T & { product_kit_items: KitItem[] }> {
  const itemsByKit = new Map<string, KitItem[]>();
  for (const item of composition) {
    const quantity = Math.trunc(Number(item.quantity));
    if (!item.kit_id || !item.product_id || quantity < 1) continue;
    const items = itemsByKit.get(item.kit_id) || [];
    items.push({ product_id: item.product_id, quantity });
    itemsByKit.set(item.kit_id, items);
  }

  return kits.map((kit) => ({
    ...kit,
    product_kit_items: itemsByKit.get(kit.id) || [],
  }));
}

/**
 * Keeps the Kit listing independent from PostgREST's nested-relation syntax.
 * The catalog already provides the administrator's complete product list, while
 * composition rows are loaded separately by kit_id.
 */
export function buildKitRecords(catalog: Wine[], composition: KitCompositionRecord[]): KitRecord[] {
  const kits: KitRecordBase[] = catalog
    .filter((product) => product.product_kind === 'kit')
    .map((product) => ({
      id: product.id,
      nome: product.name,
      descricao: product.description,
      preco_original: product.original_price ?? product.base_price ?? null,
      preco: product.price,
      sku_sankhya: product.product_code,
      estoque: product.stock,
      imagem_url: product.image_url,
      publicado: product.published,
    }));

  return attachKitItems(kits, composition);
}
