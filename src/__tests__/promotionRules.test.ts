import { describe, expect, it } from 'vitest';
import type { Promotion } from '@/types/database';
import {
  calculatePromotionDiscount,
  getPromotionBottleCount,
  getPromotionEligibleSubtotal,
} from '@/lib/promotions/rules';

const basePromotion: Promotion = {
  id: 'promotion-1',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  code: 'VINHO10',
  title: 'Vinho 10%',
  description: null,
  discount_type: 'percent',
  discount_value: 10,
  scope: 'store',
  min_subtotal: 100,
  min_item_quantity: null,
  requires_first_purchase: false,
  max_discount: null,
  applicable_product_ids: [],
  custom_rule: null,
  starts_at: null,
  ends_at: null,
  is_active: true,
};

describe('coupon rules', () => {
  const cart = [
    { id: 'wine-a', price: 100, quantity: 1 },
    { id: 'wine-b', price: 50, quantity: 2, kit_item_count: 3 },
  ];

  it('calculates a storewide percentage discount after the minimum order amount', () => {
    expect(calculatePromotionDiscount(basePromotion, cart)).toBe(20);
  });

  it('limits a selected-products fixed discount to the eligible items', () => {
    const promotion: Promotion = {
      ...basePromotion,
      discount_type: 'fixed',
      discount_value: 80,
      scope: 'selected_products',
      applicable_product_ids: ['wine-b'],
    };

    expect(getPromotionEligibleSubtotal(promotion, cart)).toBe(100);
    expect(calculatePromotionDiscount(promotion, cart)).toBe(80);
  });

  it('does not apply when the minimum bottle quantity is not reached', () => {
    const promotion: Promotion = { ...basePromotion, min_item_quantity: 8 };

    expect(getPromotionBottleCount(cart)).toBe(7);
    expect(calculatePromotionDiscount(promotion, cart)).toBe(0);
  });
});
