import type { Promotion } from '@/types/database';

export function normalizePromotionCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

export function calculatePromotionDiscount(promotion: Promotion, subtotal: number) {
  if (subtotal <= 0 || subtotal < promotion.min_subtotal) return 0;

  const rawDiscount =
    promotion.discount_type === 'percent'
      ? subtotal * (promotion.discount_value / 100)
      : promotion.discount_value;
  const cappedDiscount = promotion.max_discount
    ? Math.min(rawDiscount, promotion.max_discount)
    : rawDiscount;

  return Math.min(subtotal, Math.max(0, Number(cappedDiscount.toFixed(2))));
}

export function isPromotionCurrentlyActive(promotion: Promotion, now = new Date()) {
  if (!promotion.is_active) return false;

  const startsAt = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at) : null;

  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}
