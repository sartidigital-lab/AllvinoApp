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
  criado_em: string;
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
    created_at: product.criado_em,
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
  };
}
