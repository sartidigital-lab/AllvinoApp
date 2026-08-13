import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizePromotionCode } from '@/lib/promotions/rules';
import { normalizeZipCode } from '@/lib/delivery/rules';
import { checkoutRequestSchema } from '@/lib/validation/checkout';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { auditSecurityEvent } from '@/lib/security/audit';

const checkoutMessages = [
  'Pedido invalido.',
  'Nao foi possivel validar os produtos.',
  'Produto sem codigo de estoque.',
  'Produto indisponivel para compra.',
  'Quantidade de produto invalida.',
  'Estoque insuficiente para concluir o pedido.',
  'Cupom invalido ou expirado.',
  'Cupom nao atende ao valor minimo do pedido.',
  'Informe um CEP valido para entrega.',
  'Ainda nao entregamos neste CEP.',
  'Modalidade de entrega invalida.',
  'Forma de pagamento invalida.',
  'Informe o endereco de entrega.',
] as const;

function getSafeCheckoutError(error: { message?: string } | null) {
  const message = error?.message || '';
  return checkoutMessages.find((candidate) => message.includes(candidate))
    || 'Nao foi possivel criar o pedido.';
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const limit = checkRateLimit(getClientKey(request, 'checkout', user.id), 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo da requisicao invalido.' }, { status: 400 });
  }

  const parsed = checkoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados do pedido invalidos.' }, { status: 400 });
  }

  const cartItems = parsed.data.cartItems;
  const deliveryMethod = parsed.data.deliveryMethod;
  const paymentMethod = parsed.data.paymentMethod;
  const deliveryAddress = parsed.data.deliveryAddress?.trim() || null;
  const promotionCode = normalizePromotionCode(parsed.data.promotionCode || '');
  const deliveryZipCode = normalizeZipCode(parsed.data.deliveryZipCode || '');

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
    const message = getSafeCheckoutError(checkoutError);
    const status = /estoque/i.test(message) ? 409 : 400;
    if (checkoutError) {
      auditSecurityEvent('order.create_failed', { userId: user.id, code: checkoutError.code });
    }
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

  auditSecurityEvent('order.created', { userId: user.id, orderId });

  return NextResponse.json({ order });
}
