import { createClient } from '@/utils/supabase/client';
import { Order, OrderItem, OrderWithItems } from '@/types/database';
import { CartItem } from '@/context/CartContext';

export async function createOrder(
  userId: string, 
  cartItems: CartItem[], 
  total: number,
  deliveryMethod: string,
  paymentMethod?: string,
  deliveryAddress?: string
): Promise<{ order: Order | null; error: Error | null }> {
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, cartItems, deliveryMethod, paymentMethod, deliveryAddress }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Erro ao criar pedido.');
      }

      return { order: payload.order as Order, error: null };
    } catch (error) {
      console.error('Error creating order through API:', error);
      return { order: null, error: error as Error };
    }
  }

  const supabase = createClient();

  try {
    // 1. Insert into orders table
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        status: 'pending',
        total_amount: total,
        delivery_type: deliveryMethod,
        payment_method: paymentMethod || null,
        delivery_address: deliveryAddress || null,
        discount_amount: 0,
        subtotal_amount: total,
      })
      .select('id,user_id,status,total_amount,created_at,delivery_type,payment_method,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone')
      .single();

    if (orderError) throw orderError;
    const order = orderData as Order;

    // 2. Insert order items
    const itemsToInsert = cartItems.map((item) => ({
      order_id: order.id,
      wine_id: null,
      product_id: item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    return { order, error: null };
  } catch (error) {
    console.error('Error creating order:', error);
    return { order: null, error: error as Error };
  }
}

export async function getUserOrders(userId: string, limit = 10): Promise<{ orders: OrderWithItems[]; error: Error | null }> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id,user_id,status,total_amount,created_at,delivery_type,payment_method,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone,order_items(id,order_id,wine_id,product_id,product_name,quantity,unit_price)')
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
