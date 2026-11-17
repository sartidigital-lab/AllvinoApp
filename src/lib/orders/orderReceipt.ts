export type OrderReceiptItem = {
  product_id: string | null;
  product_name: string | null;
  quantity: number;
  unit_price: number;
};

export type KitComponent = {
  product_id: string;
  name: string;
  quantity_per_kit: number;
};

export type OrderReceiptItemWithComposition = OrderReceiptItem & {
  kit_components: KitComponent[];
};

export function getOrderItemName(item: Pick<OrderReceiptItem, 'product_name'>) {
  return item.product_name || 'Produto removido';
}

export function getKitComponentsForOrderItem(
  item: Pick<OrderReceiptItem, 'product_id'>,
  componentsByKitId: Record<string, KitComponent[]>,
) {
  if (!item.product_id) return [];
  return componentsByKitId[item.product_id] || [];
}

export function getOrderItemWithComposition(
  item: OrderReceiptItem,
  componentsByKitId: Record<string, KitComponent[]>,
): OrderReceiptItemWithComposition {
  return {
    ...item,
    kit_components: getKitComponentsForOrderItem(item, componentsByKitId),
  };
}

export function getKitComponentOrderQuantity(itemQuantity: number, quantityPerKit: number) {
  return Math.max(0, Math.trunc(itemQuantity)) * Math.max(0, Math.trunc(quantityPerKit));
}
