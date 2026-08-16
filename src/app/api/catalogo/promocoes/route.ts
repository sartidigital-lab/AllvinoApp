import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data, error } = await supabase
    .from('catalog_banners')
    .select('id,created_at,updated_at,promotion_id,eyebrow,title,subtitle,cta_label,image_url,mobile_image_url,image_alt,theme,sort_order,starts_at,ends_at,is_active,product_promotions!inner(title,slug,discount_percent)')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar os destaques.' }, { status: 500 });
  }

  const banners = (data || []).flatMap(({ product_promotions, ...banner }) => {
    const promotion = Array.isArray(product_promotions) ? product_promotions[0] : product_promotions;
    return promotion ? [{
      ...banner,
      promotion_title: promotion.title,
      promotion_slug: promotion.slug,
      discount_percent: Number(promotion.discount_percent),
    }] : [];
  });

  return NextResponse.json(banners, {
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}
