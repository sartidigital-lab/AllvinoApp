import { describe, expect, it } from 'vitest';
import { mapCatalogProductToWine } from '@/lib/catalog/products';

describe('catalog promotions', () => {
  it('maps the effective price and promotion metadata to the public wine', () => {
    const wine = mapCatalogProductToWine({
      id: 'wine-1',
      nome: 'Reserva Especial',
      descricao: null,
      base_price: 100,
      effective_price: 80,
      sku_sankhya: 'SKU-1',
      imagem_url: null,
      pais: 'Argentina',
      regiao: 'Mendoza',
      tipo: 'Tinto',
      uva: 'Malbec',
      estoque: 5,
      publicado: true,
      criado_em: '2026-09-07T12:00:00Z',
      promotion_id: 'promotion-1',
      promotion_title: 'Semana Malbec',
      promotion_slug: 'semana-malbec',
      discount_percent: 20,
    });

    expect(wine.price).toBe(80);
    expect(wine.base_price).toBe(100);
    expect(wine.discount_percent).toBe(20);
    expect(wine.promotion_slug).toBe('semana-malbec');
  });
});
