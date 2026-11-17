import { describe, expect, it } from 'vitest';
import { getKitComponentOrderQuantity, getOrderItemWithComposition } from '@/lib/orders/orderReceipt';

describe('order receipt composition', () => {
  it('includes kit components and calculates their total quantities in the order', () => {
    const item = getOrderItemWithComposition({
      product_id: 'kit-1',
      product_name: 'Kit Seleção',
      quantity: 2,
      unit_price: 199.9,
    }, {
      'kit-1': [
        { product_id: 'wine-1', name: 'Vinho Tinto', quantity_per_kit: 2 },
        { product_id: 'wine-2', name: 'Vinho Branco', quantity_per_kit: 1 },
      ],
    });

    expect(item.kit_components).toHaveLength(2);
    expect(getKitComponentOrderQuantity(item.quantity, item.kit_components[0].quantity_per_kit)).toBe(4);
    expect(getKitComponentOrderQuantity(item.quantity, item.kit_components[1].quantity_per_kit)).toBe(2);
  });

  it('keeps regular products without a kit composition', () => {
    const item = getOrderItemWithComposition({
      product_id: 'wine-1',
      product_name: 'Vinho Tinto',
      quantity: 1,
      unit_price: 89.9,
    }, {});

    expect(item.kit_components).toEqual([]);
  });
});
