import { Wine } from '@/types/database';

export type LegacyProduct = {
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

export function mapProductToWine(product: LegacyProduct): Wine {
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

export function mapWineToProduct(wineData: Partial<Wine>) {
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
