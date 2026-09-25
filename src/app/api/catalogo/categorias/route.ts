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
    .from('catalog_product_categories')
    .select('id,title,slug,sort_order,is_active,catalog_product_category_items(product_id,sort_order)')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar as categorias.' }, { status: 500 });
  }

  const categories = (data || []).map((category) => ({
    ...category,
    items: (category.catalog_product_category_items || [])
      .map((item: { product_id: string; sort_order: number }) => ({ product_id: item.product_id, sort_order: Number(item.sort_order || 0) }))
      .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order),
  }));

  return NextResponse.json(categories, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
}
