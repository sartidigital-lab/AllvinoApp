import { describe, expect, it } from 'vitest';
import { addKitItem, MAX_KIT_ITEM_QUANTITY, normalizeKitItemQuantity, removeKitItem, updateKitItemQuantity } from '@/lib/kits/composition';

describe('kit composition', () => {
  it('adds another unit when the same product code is included again', () => {
    expect(addKitItem([{ product_id: 'wine-1', quantity: 1 }], 'wine-1')).toEqual([
      { product_id: 'wine-1', quantity: 2 },
    ]);
  });

  it('preserves other products and enforces the supported quantity range', () => {
    expect(addKitItem([{ product_id: 'wine-1', quantity: 2 }], 'wine-2')).toEqual([
      { product_id: 'wine-1', quantity: 2 },
      { product_id: 'wine-2', quantity: 1 },
    ]);
    expect(normalizeKitItemQuantity(MAX_KIT_ITEM_QUANTITY + 1)).toBe(MAX_KIT_ITEM_QUANTITY);
  });

  it('updates or removes an existing item from a saved kit composition', () => {
    const items = [
      { product_id: 'wine-1', quantity: 1 },
      { product_id: 'wine-2', quantity: 3 },
    ];

    expect(updateKitItemQuantity(items, 'wine-1', 4)).toEqual([
      { product_id: 'wine-1', quantity: 4 },
      { product_id: 'wine-2', quantity: 3 },
    ]);
    expect(removeKitItem(items, 'wine-1')).toEqual([
      { product_id: 'wine-2', quantity: 3 },
    ]);
  });
});
