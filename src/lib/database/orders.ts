import { Order, OrderWithItems } from '@/types/database';
import { CartItem } from '@/context/CartContext';

export async function createOrder(
  userId: string, 
  cartItems: CartItem[], 
  total: number,
  deliveryMethod: string,
  paymentMethod?: string,
  deliveryAddress?: string,
  promotionCode?: string,
  deliveryZipCode?: string
): Promise<{ order: Order | null; error: Error | null }> {
  try {
    const response = await fetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, cartItems, deliveryMethod, paymentMethod, deliveryAddress, promotionCode, deliveryZipCode }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Erro ao criar pedido.');
    return { order: payload.order as Order, error: null };
  } catch (error) {
    console.error('Error creating order through API:', error);
    return { order: null, error: error as Error };
  }
}

export async function getUserOrders(userId: string, limit = 10): Promise<{ orders: OrderWithItems[]; error: Error | null }> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    const response = await fetch(`/api/cliente/pedidos?${params.toString()}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || 'Erro ao carregar pedidos.');
    }
    
    return { orders: payload.orders as OrderWithItems[], error: null };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { orders: [], error: error as Error };
  }
}
