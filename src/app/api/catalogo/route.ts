import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LegacyProduct, mapProductToWine } from '@/lib/catalog/products';

export const revalidate = 60;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } = await supabase
    .from('produtos')
    .select('id,nome,descricao,preco,imagem_url,pais,tipo,uva,estoque,criado_em')
    .order('criado_em', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Nao foi possivel carregar o catalogo.' }, { status: 500 });
  }

  return NextResponse.json(((data || []) as LegacyProduct[]).map(mapProductToWine), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  });
}
