import { Wine } from '@/types/database';

export type LegacyProduct = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  base_price?: number;
  effective_price?: number;
  discount_percent?: number | null;
  promotion_id?: string | null;
  promotion_title?: string | null;
  promotion_slug?: string | null;
  sku_sankhya: string | null;
  imagem_url: string | null;
  pais: string | null;
  regiao: string | null;
  tipo: string | null;
  uva: string | null;
  estoque: number | null;
  publicado: boolean | null;
  criado_em: string;
};

export function mapProductToWine(product: LegacyProduct): Wine {
  const originalPrice = Number(product.base_price ?? product.preco);
  const effectivePrice = Number(product.effective_price ?? product.preco);

  return {
    id: product.id,
    name: product.nome,
    description: product.descricao,
    price: effectivePrice,
    original_price: originalPrice,
    discount_percent: product.discount_percent ? Number(product.discount_percent) : null,
    promotion_id: product.promotion_id || null,
    promotion_title: product.promotion_title || null,
    promotion_slug: product.promotion_slug || null,
    image_url: product.imagem_url,
    type: product.tipo,
    region: product.regiao,
    grape: product.uva,
    category: product.pais,
    stock: Number(product.estoque ?? 0),
    product_code: product.sku_sankhya,
    published: product.publicado !== false,
    created_at: product.criado_em,
  };
}

export function mapWineToProduct(wineData: Partial<Wine>) {
  return {
    nome: wineData.name,
    descricao: wineData.description,
    sku_sankhya: wineData.product_code,
    preco: wineData.original_price ?? wineData.price,
    imagem_url: wineData.image_url,
    pais: wineData.category,
    regiao: wineData.region,
    tipo: wineData.type,
    uva: wineData.grape,
    estoque: wineData.stock,
    publicado: wineData.published ?? true,
  };
}
