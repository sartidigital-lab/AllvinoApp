export type KitItem = { product_id: string; quantity: number };

export const MAX_KIT_ITEM_QUANTITY = 999;

export function normalizeKitItemQuantity(quantity: number) {
  return Math.min(MAX_KIT_ITEM_QUANTITY, Math.max(1, Math.trunc(Number(quantity) || 1)));
}

export function addKitItem(items: KitItem[], productId: string) {
  const currentItem = items.find((item) => item.product_id === productId);

  if (!currentItem) return [...items, { product_id: productId, quantity: 1 }];

  return items.map((item) => item.product_id === productId
    ? { ...item, quantity: normalizeKitItemQuantity(item.quantity + 1) }
    : item,
  );
}

export function updateKitItemQuantity(items: KitItem[], productId: string, quantity: number) {
  return items.map((item) => item.product_id === productId
    ? { ...item, quantity: normalizeKitItemQuantity(quantity) }
    : item,
  );
}

export function removeKitItem(items: KitItem[], productId: string) {
  return items.filter((item) => item.product_id !== productId);
}
