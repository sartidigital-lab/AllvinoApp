import { createClient } from '@/utils/supabase/client';
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
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,status,total_amount,created_at,delivery_type,payment_method,payment_provider,payment_status,payment_reference,payment_url,paid_at,payment_error,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone,promotion_code,delivery_zip_code,delivery_zone_name,delivery_estimate_days,shipping_fee,stock_reserved_at,order_items(id,order_id,wine_id,product_id,product_name,quantity,unit_price)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return { orders: data as OrderWithItems[], error: null };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { orders: [], error: error as Error };
  }
}
