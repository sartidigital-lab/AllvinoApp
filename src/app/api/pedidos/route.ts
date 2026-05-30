import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type OrderItemInput = {
  id: string;
  name: string;
  quantity: number;
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
    paymentMethod?: string;
    deliveryAddress?: string;
  };

  const cartItems = body.cartItems || [];
  const deliveryMethod = body.deliveryMethod || 'delivery';
  const paymentMethod = body.paymentMethod || null;
  const deliveryAddress = body.deliveryAddress?.trim() || null;

  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Pedido invalido.' }, { status: 400 });
  }

  const productIds = Array.from(new Set(cartItems.map((item) => item.id)));
  const { data: products, error: productsError } = await supabase
    .from('produtos')
    .select('id,nome,preco')
    .in('id', productIds);

  if (productsError || !products || products.length !== productIds.length) {
    return NextResponse.json({ error: 'Nao foi possivel validar os produtos.' }, { status: 400 });
  }

  const productsById = new Map(products.map((product) => [product.id, product]));
  const validatedItems = cartItems.map((item) => {
    const product = productsById.get(item.id);
    const quantity = Math.max(1, Number(item.quantity || 1));

    return {
      id: item.id,
      name: product?.nome || item.name,
      quantity,
      price: Number(product?.preco || 0),
    };
  });

  const subtotal = validatedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discount = deliveryMethod === 'Retirada na Loja' ? subtotal * 0.1 : 0;
  const total = subtotal - discount;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      status: 'pending',
      total_amount: total,
      delivery_type: deliveryMethod,
      payment_method: paymentMethod,
      delivery_address: deliveryAddress,
      discount_amount: discount,
      subtotal_amount: subtotal,
      customer_name: user.user_metadata?.nome_completo || user.email?.split('@')[0] || null,
      customer_phone: user.user_metadata?.telefone || null,
    })
    .select('id,user_id,status,total_amount,created_at,delivery_type,payment_method,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Nao foi possivel criar o pedido.' }, { status: 500 });
  }

  const itemsToInsert = validatedItems.map((item) => ({
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
