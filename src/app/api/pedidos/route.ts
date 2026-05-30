import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type OrderItemInput = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    cartItems?: OrderItemInput[];
    total?: number;
    deliveryMethod?: string;
  };

  const cartItems = body.cartItems || [];
  const total = Number(body.total || 0);
  const deliveryMethod = body.deliveryMethod || 'delivery';

  if (cartItems.length === 0 || total <= 0) {
    return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'pending',
      total_amount: total,
      delivery_type: deliveryMethod,
      customer_name: user.user_metadata?.nome_completo || user.email?.split('@')[0] || null,
      customer_phone: user.user_metadata?.telefone || null,
    })
    .select('id,user_id,status,total_amount,created_at,delivery_type,customer_name,customer_phone')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Nao foi possivel criar o pedido.' }, { status: 500 });
  }

  const itemsToInsert = cartItems.map((item) => ({
    order_id: order.id,
    wine_id: null,
    product_id: item.id,
    product_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

  if (itemsError) {
    return NextResponse.json({ error: 'Nao foi possivel criar os itens do pedido.' }, { status: 500 });
  }

  return NextResponse.json({ order });
}
