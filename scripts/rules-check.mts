import assert from 'node:assert/strict';
import {
  calculateShippingFee,
  formatZipCode,
  normalizeZipCode,
  zipMatchesZone,
} from '../src/lib/delivery/rules.ts';
import {
  calculatePromotionDiscount,
  isPromotionCurrentlyActive,
  normalizePromotionCode,
} from '../src/lib/promotions/rules.ts';
import type { DeliveryZone, Promotion } from '../src/types/database.ts';

const baseZone: DeliveryZone = {
  id: 'zone-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  name: 'Vitoria',
  zip_start: '29000000',
  zip_end: '29099999',
  fee: 19.9,
  free_shipping_min_subtotal: 300,
  estimate_days: 1,
  is_active: true,
};

const basePromotion: Promotion = {
  id: 'promo-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  code: 'VINHO10',
  title: 'Vinho 10',
  description: null,
  discount_type: 'percent',
  discount_value: 10,
  min_subtotal: 100,
  max_discount: 25,
  starts_at: null,
  ends_at: null,
  is_active: true,
};

assert.equal(normalizeZipCode('29.060-120'), '29060120');
assert.equal(formatZipCode('29060120'), '29060-120');
assert.equal(zipMatchesZone('29060-120', baseZone), true);
assert.equal(zipMatchesZone('29100-000', baseZone), false);
assert.equal(calculateShippingFee(baseZone, 299.99), 19.9);
assert.equal(calculateShippingFee(baseZone, 300), 0);

assert.equal(normalizePromotionCode(' vinho 10 '), 'VINHO10');
assert.equal(calculatePromotionDiscount(basePromotion, 90), 0);
assert.equal(calculatePromotionDiscount(basePromotion, 150), 15);
assert.equal(calculatePromotionDiscount(basePromotion, 400), 25);
assert.equal(isPromotionCurrentlyActive(basePromotion), true);
assert.equal(isPromotionCurrentlyActive({ ...basePromotion, is_active: false }), false);
assert.equal(
  isPromotionCurrentlyActive({
    ...basePromotion,
    starts_at: new Date(Date.now() + 60_000).toISOString(),
  }),
  false
);

console.log('Domain rules check passed.');
