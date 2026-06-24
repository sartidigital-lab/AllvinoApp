import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LegacyProduct, mapProductToWine } from '@/lib/catalog/products';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
    .select('id,nome,descricao,preco,sku_sankhya,imagem_url,pais,regiao,tipo,uva,estoque,publicado,criado_em')
    .eq('publicado', true)
    .order('criado_em', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Não foi possível carregar o catálogo.' }, { status: 500 });
  }

  return NextResponse.json(((data || []) as LegacyProduct[]).map(mapProductToWine), {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
