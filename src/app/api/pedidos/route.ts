import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizePromotionCode } from '@/lib/promotions/rules';
import { normalizeZipCode } from '@/lib/delivery/rules';

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
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const body = (await request.json()) as {
    cartItems?: OrderItemInput[];
    deliveryMethod?: string;
    paymentMethod?: string;
    deliveryAddress?: string;
    promotionCode?: string;
    deliveryZipCode?: string;
  };

  const cartItems = body.cartItems || [];
  const deliveryMethod = body.deliveryMethod || 'delivery';
  const paymentMethod = body.paymentMethod || null;
  const deliveryAddress = body.deliveryAddress?.trim() || null;
  const promotionCode = normalizePromotionCode(body.promotionCode || '');
  const deliveryZipCode = normalizeZipCode(body.deliveryZipCode || '');

  if (cartItems.length === 0) {
    return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const { data: orderId, error: checkoutError } = await supabase.rpc(
    'create_order_with_stock_reservation',
    {
      p_cart_items: cartItems,
      p_delivery_method: deliveryMethod,
      p_payment_method: paymentMethod,
      p_delivery_address: deliveryAddress,
      p_promotion_code: promotionCode || null,
      p_delivery_zip_code: deliveryZipCode || null,
      p_customer_name: user.user_metadata?.nome_completo || user.email?.split('@')[0] || null,
      p_customer_phone: user.user_metadata?.telefone || null,
    }
  );

  if (checkoutError || !orderId) {
    const message = checkoutError?.message || 'Não foi possível criar o pedido.';
    const status = /estoque/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id,status,total_amount,created_at,delivery_type,payment_method,payment_provider,payment_status,payment_reference,payment_url,paid_at,payment_error,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone,promotion_code,delivery_zip_code,delivery_zone_name,delivery_estimate_days,shipping_fee,stock_reserved_at')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido criado, mas não foi possível carregar o resumo.' }, { status: 500 });
  }

  return NextResponse.json({ order });
}
