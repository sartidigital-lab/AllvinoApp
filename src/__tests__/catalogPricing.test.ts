import { describe, expect, it } from 'vitest';
import { mapProductToWine, mapWineToProduct } from '@/lib/catalog/products';

const product = {
  id: '11111111-1111-4111-8111-111111111111',
  nome: 'Reserva da Casa',
  descricao: null,
  preco: 100,
  base_price: 100,
  effective_price: 75,
  discount_percent: 25,
  promotion_id: '22222222-2222-4222-8222-222222222222',
  promotion_title: 'Seleção especial',
  promotion_slug: 'selecao-especial',
  sku_sankhya: 'SKU-1',
  imagem_url: null,
  pais: 'Brasil',
  regiao: 'Serra',
  tipo: 'Tinto',
  uva: 'Merlot',
  estoque: 10,
  publicado: true,
  criado_em: '2026-01-01T00:00:00.000Z',
};

describe('catalog promotion pricing', () => {
  it('uses the server-calculated effective price and preserves the base price', () => {
    const wine = mapProductToWine(product);
    expect(wine.price).toBe(75);
    expect(wine.original_price).toBe(100);
    expect(wine.discount_percent).toBe(25);
    expect(wine.promotion_slug).toBe('selecao-especial');
  });

  it('never writes a promotional price over the base product price', () => {
    const wine = mapProductToWine(product);
    expect(mapWineToProduct(wine).preco).toBe(100);
  });

  it('falls back to the base product price outside a campaign', () => {
    const wine = mapProductToWine({
      ...product,
      base_price: undefined,
      effective_price: undefined,
      discount_percent: null,
      promotion_id: null,
      promotion_title: null,
      promotion_slug: null,
    });
    expect(wine.price).toBe(100);
    expect(wine.original_price).toBe(100);
    expect(wine.discount_percent).toBeNull();
  });
});
