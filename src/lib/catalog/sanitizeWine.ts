import { Wine } from '@/types/database';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_CART_QUANTITY = 50;

export type StoredCartItem = {
  id: string;
  quantity: number;
};

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asNonNegativeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function asNonNegativeInteger(value: unknown, fallback = 0) {
  return Math.trunc(asNonNegativeNumber(value, fallback));
}

function asQuantity(value: unknown) {
  const quantity = asNonNegativeInteger(value, 1);
  return Math.min(MAX_CART_QUANTITY, Math.max(1, quantity));
}

export function sanitizeWine(value: unknown): Wine | null {
  if (!value || typeof value !== 'object') return null;

  const input = value as Record<string, unknown>;
  const id = asString(input.id).trim();
  const name = asString(input.name).trim();

  if (!UUID_PATTERN.test(id) || !name) return null;

  return {
    id,
    name,
    description: asNullableString(input.description),
    price: asNonNegativeNumber(input.price),
    original_price: asNonNegativeNumber(input.original_price, asNonNegativeNumber(input.price)),
    discount_percent: input.discount_percent == null ? null : asNonNegativeInteger(input.discount_percent),
    promotion_id: asNullableString(input.promotion_id),
    promotion_title: asNullableString(input.promotion_title),
    promotion_slug: asNullableString(input.promotion_slug),
    image_url: asNullableString(input.image_url),
    type: asNullableString(input.type),
    region: asNullableString(input.region),
    grape: asNullableString(input.grape),
    category: asNullableString(input.category),
    stock: asNonNegativeInteger(input.stock),
    product_code: asNullableString(input.product_code),
    published: input.published !== false,
    created_at: asString(input.created_at, new Date(0).toISOString()),
  };
}

export function sanitizeWineList(value: unknown): Wine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const wine = sanitizeWine(item);
    return wine ? [wine] : [];
  });
}

export function sanitizeCartItem(value: unknown): (Wine & { quantity: number }) | null {
  const wine = sanitizeWine(value);
  if (!wine || !value || typeof value !== 'object') return null;

  const quantity = asQuantity((value as Record<string, unknown>).quantity);
  return { ...wine, quantity };
}

export function sanitizeCartItems(value: unknown): Array<Wine & { quantity: number }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const cartItem = sanitizeCartItem(item);
    return cartItem ? [cartItem] : [];
  });
}

export function sanitizeStoredCartItems(value: unknown): StoredCartItem[] {
  if (!Array.isArray(value)) return [];

  const itemsById = new Map<string, StoredCartItem>();
  value.forEach((item) => {
    if (!item || typeof item !== 'object') return;

    const input = item as Record<string, unknown>;
    const id = asString(input.id).trim();
    if (!UUID_PATTERN.test(id)) return;

    const current = itemsById.get(id);
    const quantity = asQuantity(input.quantity);
    itemsById.set(id, {
      id,
      quantity: Math.min(MAX_CART_QUANTITY, (current?.quantity || 0) + quantity),
    });
  });

  return [...itemsById.values()];
}

export function sanitizeStoredWineIds(value: unknown, maxItems = 200): string[] {
  if (!Array.isArray(value)) return [];

  const ids: string[] = [];
  const seen = new Set<string>();

  value.forEach((item) => {
    const id = typeof item === 'string'
      ? item.trim()
      : item && typeof item === 'object'
        ? asString((item as Record<string, unknown>).id).trim()
        : '';

    if (!UUID_PATTERN.test(id) || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });

  return ids.slice(0, maxItems);
}

export function getMaxCartQuantity() {
  return MAX_CART_QUANTITY;
}
