import { Wine } from '@/types/database';
import { parseGrapes, serializeGrapes } from '@/lib/catalog/grapes';
import { formatProductDescription, formatProductText } from '@/lib/catalog/productText';

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

export type CatalogProduct = {
  id: string;
  nome: string;
  descricao: string | null;
  base_price: number;
  effective_price: number;
  sku_sankhya: string | null;
  imagem_url: string | null;
  pais: string | null;
  regiao: string | null;
  tipo: string | null;
  uva: string | null;
  estoque: number | null;
  publicado: boolean | null;
  criado_em: string;
  promotion_id: string | null;
  promotion_title: string | null;
  promotion_slug: string | null;
  discount_percent: number | null;
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

export function mapCatalogProductToWine(product: CatalogProduct): Wine {
  return {
    id: product.id,
    name: product.nome,
    description: product.descricao,
    price: Number(product.effective_price),
    base_price: Number(product.base_price),
    image_url: product.imagem_url,
    type: product.tipo,
    region: product.regiao,
    grape: product.uva,
    category: product.pais,
    stock: Number(product.estoque ?? 0),
    product_code: product.sku_sankhya,
    published: product.publicado !== false,
    created_at: product.criado_em,
    promotion_id: product.promotion_id,
    promotion_title: product.promotion_title,
    promotion_slug: product.promotion_slug,
    discount_percent: product.discount_percent === null ? null : Number(product.discount_percent),
  };
}

export function mapWineToProduct(wineData: Partial<Wine>) {
  return {
    nome: wineData.name === undefined ? undefined : formatProductText(wineData.name),
    descricao: wineData.description === undefined ? undefined : wineData.description === null ? null : formatProductDescription(wineData.description),
    sku_sankhya: wineData.product_code,
    preco: wineData.original_price ?? wineData.price,
    imagem_url: wineData.image_url,
    pais: wineData.category === undefined ? undefined : wineData.category === null ? null : formatProductText(wineData.category),
    regiao: wineData.region === undefined ? undefined : wineData.region === null ? null : formatProductText(wineData.region),
    tipo: wineData.type === undefined ? undefined : wineData.type === null ? null : formatProductText(wineData.type),
    uva: wineData.grape === undefined ? undefined : serializeGrapes(parseGrapes(wineData.grape).map(formatProductText)),
    estoque: wineData.stock,
    publicado: wineData.published ?? true,
  };
}
