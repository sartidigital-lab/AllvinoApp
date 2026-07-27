import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';

const orderSelect = 'id,user_id,status,total_amount,created_at,delivery_type,payment_method,payment_provider,payment_status,payment_reference,payment_url,paid_at,payment_error,delivery_address,discount_amount,subtotal_amount,customer_name,customer_phone,promotion_code,delivery_zip_code,delivery_zone_name,delivery_estimate_days,shipping_fee,stock_reserved_at,order_items(id,order_id,wine_id,product_id,product_name,quantity,unit_price)';

function getLimit(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get('limit') || 10);
  return Number.isFinite(limit) ? Math.min(50, Math.max(1, Math.trunc(limit))) : 10;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Nao autenticado.' }, { status: 401 });
  }

  const limit = checkRateLimit(getClientKey(request, 'customer-orders', user.id), 60, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const { data, error } = await supabase
    .from('orders')
    .select(orderSelect)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(getLimit(request));

  if (error) {
    return NextResponse.json({ error: 'Nao foi possivel carregar os pedidos.' }, { status: 500 });
  }

  return NextResponse.json({ orders: data || [] }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
