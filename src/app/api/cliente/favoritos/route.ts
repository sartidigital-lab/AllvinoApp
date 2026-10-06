import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isSameOrigin } from '@/lib/push/subscription';
import { createClient } from '@/utils/supabase/server';

const productId = z.string().uuid();
const favoriteList = z.object({ productIds: z.array(productId).max(100) });
const favoriteItem = z.object({ productId });

async function currentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user: error ? null : user };
}

export async function GET() {
  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_favorites')
    .select('product_id')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: 'Não foi possível carregar os favoritos.' }, { status: 500 });
  return NextResponse.json({ productIds: (data || []).map((row) => row.product_id) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const parsed = favoriteList.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Favoritos inválidos.' }, { status: 400 });

  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (parsed.data.productIds.length === 0) return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });

  const { error } = await supabase.from('user_favorites').upsert(
    parsed.data.productIds.map((product_id) => ({ user_id: user.id, product_id })),
    { onConflict: 'user_id,product_id', ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: 'Não foi possível salvar os favoritos.' }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: 'Origem inválida.' }, { status: 403 });
  const parsed = favoriteItem.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Favorito inválido.' }, { status: 400 });

  const { supabase, user } = await currentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const { error } = await supabase
    .from('user_favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('product_id', parsed.data.productId);
  if (error) return NextResponse.json({ error: 'Não foi possível remover o favorito.' }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
