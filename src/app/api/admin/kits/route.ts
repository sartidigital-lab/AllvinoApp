import { NextResponse } from 'next/server';
import { attachKitItems, type KitCompositionRecord, type KitRecord } from '@/lib/kits/records';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';

type KitRow = Omit<KitRecord, 'product_kit_items'>;

function responseError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Lists Kits through a server-only, authenticated admin route. The product
 * composition has two foreign keys into produtos, so it is deliberately read
 * separately and joined by kit_id instead of relying on a nested REST join.
 */
export async function GET() {
  const sessionClient = await createClient();
  const { data: { user }, error: userError } = await sessionClient.auth.getUser();
  if (userError || !user) return responseError('Não autenticado.', 401);

  const { data: isAdmin, error: adminError } = await sessionClient.rpc('is_admin');
  if (adminError || isAdmin !== true) return responseError('Acesso administrativo necessário.', 403);

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    console.error('Admin kit list is not configured.', error);
    return responseError('A listagem de Kits não está configurada. Contate o suporte técnico.', 503);
  }

  const [kitsResult, itemsResult] = await Promise.all([
    admin
      .from('produtos')
      .select('id,nome,descricao,preco_original,preco,sku_sankhya,estoque,imagem_url,publicado')
      .eq('tipo_produto', 'kit')
      .order('criado_em', { ascending: false }),
    admin.from('product_kit_items').select('kit_id,product_id,quantity'),
  ]);

  if (kitsResult.error) {
    console.error('Admin kit list query failed.', { code: kitsResult.error.code, message: kitsResult.error.message });
    return responseError('Não foi possível carregar os Kits.', 500);
  }
  if (itemsResult.error) {
    console.error('Admin kit composition query failed.', { code: itemsResult.error.code, message: itemsResult.error.message });
    return responseError('Não foi possível carregar as composições dos Kits.', 500);
  }

  const kits = attachKitItems(
    (kitsResult.data || []) as KitRow[],
    (itemsResult.data || []) as KitCompositionRecord[],
  );
  return NextResponse.json({ kits }, { headers: { 'Cache-Control': 'no-store' } });
}
