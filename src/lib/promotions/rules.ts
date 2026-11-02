import type { Promotion } from '@/types/database';

export type PromotionCartItem = {
  id: string;
  price: number;
  quantity: number;
  kit_item_count?: number;
};

export function normalizePromotionCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function getPromotionBottleCount(items: PromotionCartItem[]) {
  return items.reduce((total, item) => total + item.quantity * Math.max(1, item.kit_item_count || 1), 0);
}

export function getPromotionEligibleSubtotal(promotion: Promotion, items: PromotionCartItem[]) {
  const selectedIds = new Set(promotion.applicable_product_ids || []);
  return items.reduce((total, item) => {
    if (promotion.scope === 'selected_products' && !selectedIds.has(item.id)) return total;
    return total + item.price * item.quantity;
  }, 0);
}

export function calculatePromotionDiscount(
  promotion: Promotion,
  subtotalOrItems: number | PromotionCartItem[]
) {
  const items = Array.isArray(subtotalOrItems) ? subtotalOrItems : [];
  const subtotal = Array.isArray(subtotalOrItems)
    ? items.reduce((total, item) => total + item.price * item.quantity, 0)
    : subtotalOrItems;
  const eligibleSubtotal = Array.isArray(subtotalOrItems)
    ? getPromotionEligibleSubtotal(promotion, items)
    : subtotal;

  if (subtotal <= 0 || subtotal < promotion.min_subtotal || eligibleSubtotal <= 0) return 0;
  if (Array.isArray(subtotalOrItems) && promotion.min_item_quantity && getPromotionBottleCount(items) < promotion.min_item_quantity) return 0;

  const rawDiscount =
    promotion.discount_type === 'percent'
      ? eligibleSubtotal * (promotion.discount_value / 100)
      : promotion.discount_value;
  const cappedDiscount = promotion.max_discount
    ? Math.min(rawDiscount, promotion.max_discount)
    : rawDiscount;

  return Math.min(eligibleSubtotal, Math.max(0, Number(cappedDiscount.toFixed(2))));
}

export function isPromotionCurrentlyActive(promotion: Promotion, now = new Date()) {
  if (!promotion.is_active) return false;

  const startsAt = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}
