import { describe, expect, it } from 'vitest';
import { sanitizeCartItems, sanitizeStoredCartItems, sanitizeStoredWineIds, sanitizeWine, sanitizeWineList } from '@/lib/catalog/sanitizeWine';

const wine = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Vinho Seguro',
  description: null,
  price: 99.9,
  image_url: null,
  type: 'Tinto',
  region: 'Serra',
  grape: 'Merlot',
  category: 'Brasil',
  stock: 8,
  product_code: 'SKU-1',
  published: true,
  created_at: '2026-01-01T00:00:00.000Z',
};

describe('catalog storage sanitizers', () => {
  it('keeps valid wines and removes invalid localStorage records', () => {
    expect(sanitizeWine(wine)?.name).toBe('Vinho Seguro');
    expect(sanitizeWine({ ...wine, id: 'not-a-uuid' })).toBeNull();
    expect(sanitizeWineList([wine, { ...wine, name: '' }, null])).toHaveLength(1);
  });

  it('normalizes cart quantities and prices from untrusted storage', () => {
    const [negativePrice, hugeQuantity] = sanitizeCartItems([
      { ...wine, price: -10, quantity: 2 },
      { ...wine, id: '22222222-2222-4222-8222-222222222222', quantity: 999 },
    ]);

    expect(negativePrice.price).toBe(0);
    expect(negativePrice.quantity).toBe(2);
    expect(hugeQuantity.quantity).toBe(50);
  });

  it('keeps persisted cart storage minimal and deduplicated by product id', () => {
    expect(sanitizeStoredCartItems([
      { id: wine.id, quantity: 2, price: 999 },
      { id: wine.id, quantity: 999 },
      { id: 'not-a-uuid', quantity: 1 },
    ])).toEqual([{ id: wine.id, quantity: 50 }]);
  });

  it('supports legacy object storage while persisting wine id lists', () => {
    expect(sanitizeStoredWineIds([
      wine.id,
      { id: '22222222-2222-4222-8222-222222222222', name: 'Legado' },
      wine.id,
      { id: 'invalid' },
    ])).toEqual([
      wine.id,
      '22222222-2222-4222-8222-222222222222',
    ]);
  });
});
