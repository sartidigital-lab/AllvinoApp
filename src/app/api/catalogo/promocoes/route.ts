import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type BannerRow = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  cta_label: string;
  cta_text_color: string;
  image_url: string;
  mobile_image_url: string | null;
  image_alt: string | null;
  sort_order: number;
  show_text: boolean;
  show_cta: boolean;
  show_discount_badge: boolean;
  promotion: { slug: string; title: string; discount_percent: number } | { slug: string; title: string; discount_percent: number }[];
};

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data, error } = await supabase
    .from('catalog_banners')
    .select('id,eyebrow,title,subtitle,cta_label,cta_text_color,image_url,mobile_image_url,image_alt,sort_order,show_text,show_cta,show_discount_badge,promotion:product_promotions!inner(slug,title,discount_percent)')
    .not('image_url', 'is', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar os banners.' }, { status: 500 });
  }

  const banners = ((data || []) as BannerRow[]).map((banner) => ({
    ...banner,
    promotion: Array.isArray(banner.promotion) ? banner.promotion[0] : banner.promotion,
  }));

  return NextResponse.json(banners, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
