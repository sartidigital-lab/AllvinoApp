import { Wine } from '@/types/database';

export type LegacyProduct = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
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
  return {
    id: product.id,
    name: product.nome,
    description: product.descricao,
    price: Number(product.preco),
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
    nome: wineData.name,
    descricao: wineData.description,
    sku_sankhya: wineData.product_code,
    preco: wineData.price,
    imagem_url: wineData.image_url,
    pais: wineData.category,
    regiao: wineData.region,
    tipo: wineData.type,
    uva: wineData.grape,
    estoque: wineData.stock,
    publicado: wineData.published ?? true,
  };
}
