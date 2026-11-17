import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.from('product_selections').select('id,title,description,image_url,product_ids').eq('is_active', true).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Não foi possível carregar as seleções.' }, { status: 500 });
  return NextResponse.json(data || [], { headers: { 'Cache-Control': 'no-store' } });
}
