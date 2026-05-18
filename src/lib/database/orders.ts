import { createClient } from '@/utils/supabase/client';
import { Order, OrderItem } from '@/types/database';
import { CartItem } from '@/context/CartContext';

export async function createOrder(
  userId: string, 
  cartItems: CartItem[], 
  total: number, 
  deliveryMethod: string
): Promise<{ order: Order | null; error: Error | null }> {
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
      })
      .select()
      .single();

    if (orderError) throw orderError;
    const order = orderData as Order;

    // 2. Insert order items
    const itemsToInsert = cartItems.map((item) => ({
      order_id: order.id,
      wine_id: item.id,
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

export async function getUserOrders(userId: string): Promise<{ orders: Order[]; error: Error | null }> {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return { orders: data as Order[], error: null };
  } catch (error) {
    console.error('Error fetching user orders:', error);
    return { orders: [], error: error as Error };
  }
}
