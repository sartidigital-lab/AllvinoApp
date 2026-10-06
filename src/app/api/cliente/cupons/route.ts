import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import type { CustomerCoupon, Promotion } from '@/types/database';

const promotionSelect = 'id,code,title,description,discount_type,discount_value,scope,min_subtotal,min_item_quantity,requires_first_purchase,max_discount,applicable_product_ids,custom_rule,ends_at';

function toCustomerCoupon(promotion: Promotion): CustomerCoupon {
  const { applicable_product_ids, ...coupon } = promotion;
  return {
    ...coupon,
    selected_product_count: applicable_product_ids?.length || 0,
  };
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

  const limit = await checkRateLimitDistributed(getClientKey(request, 'customer-coupons', user.id), 60, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const now = new Date().toISOString();
  const [promotionsResult, ordersResult] = await Promise.all([
    supabase
      .from('promotions')
      .select(promotionSelect)
      .eq('is_active', true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gte.${now}`)
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ]);

  if (promotionsResult.error || ordersResult.error) {
    return NextResponse.json({ error: 'Nao foi possivel carregar os cupons.' }, { status: 500 });
  }

  const isFirstPurchase = (ordersResult.count || 0) === 0;
  const coupons = ((promotionsResult.data || []) as Promotion[])
    .filter((promotion) => !promotion.requires_first_purchase || isFirstPurchase)
    .map(toCustomerCoupon);

  return NextResponse.json({ coupons }, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
