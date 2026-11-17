import { describe, expect, it } from 'vitest';
import { attachKitItems, buildKitRecords } from '@/lib/kits/records';

describe('kit records', () => {
  it('lists Kit products independently and joins their composition by kit_id', () => {
    const records = buildKitRecords([
      { id: 'wine-1', name: 'Vinho', description: null, price: 50, original_price: 50, discount_percent: null, promotion_id: null, promotion_title: null, promotion_slug: null, image_url: null, type: null, region: null, grape: null, category: null, stock: 2, product_code: 'VINHO-1', published: true, created_at: '', product_kind: 'wine' },
      { id: 'kit-1', name: 'Kit', description: 'Seleção', price: 90, original_price: 120, discount_percent: null, promotion_id: null, promotion_title: null, promotion_slug: null, image_url: null, type: null, region: null, grape: null, category: null, stock: 3, product_code: 'KIT-1', published: true, created_at: '', product_kind: 'kit' },
    ], [
      { kit_id: 'kit-1', product_id: 'wine-1', quantity: 2 },
      { kit_id: 'another-kit', product_id: 'wine-1', quantity: 1 },
    ]);

    expect(records).toEqual([expect.objectContaining({
      id: 'kit-1',
      nome: 'Kit',
      sku_sankhya: 'KIT-1',
      product_kit_items: [{ product_id: 'wine-1', quantity: 2 }],
    })]);
  });
});

describe('direct Kit records', () => {
  it('joins an admin Kit list without depending on browser catalog classification', () => {
    const records = attachKitItems([
      { id: 'kit-1', nome: 'Kit', descricao: null, preco_original: 100, preco: 80, sku_sankhya: 'KIT-1', estoque: 2, imagem_url: null, publicado: true },
    ], [{ kit_id: 'kit-1', product_id: 'wine-1', quantity: 2 }]);

    expect(records).toEqual([expect.objectContaining({
      id: 'kit-1',
      product_kit_items: [{ product_id: 'wine-1', quantity: 2 }],
    })]);
  });
});
