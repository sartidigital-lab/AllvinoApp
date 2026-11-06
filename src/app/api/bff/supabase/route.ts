import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { isSameOrigin } from '@/lib/push/subscription';

const methods = new Set(['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE']);
const adminTables = new Set([
  'catalog_banners',
  'catalog_product_categories',
  'customer_conversation_messages',
  'customer_conversations',
  'customer_crm_cards',
  'orders',
  'product_promotion_items',
  'product_promotions',
  'produtos',
  'promotions',
  'stock_imports',
  'stock_levels',
  'delivery_zones',
]);
const adminRpc = new Set([
  'delete_catalog_product_category',
  'get_stock_levels_for_codes',
  'import_stock_levels_atomic',
  'import_catalog_pricing_atomic',
  'mark_manual_payment_paid',
  'save_catalog_banner_campaign',
  'save_catalog_product_category',
  'save_product_kit',
  'save_product_promotion_campaign',
  'set_manual_stock_level',
]);

function getResource(path: string) {
  const url = new URL(path, 'https://bff.invalid');
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts[0] !== 'rest' || parts[1] !== 'v1') return null;
  if (parts[2] === 'rpc') return { kind: 'rpc' as const, name: parts[3] || '', url };
  return { kind: 'table' as const, name: parts[2] || '', url };
}

function responseError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Deliberately narrow Supabase REST BFF. It accepts only the exact admin
 * resources used by this application; customer favorites have a dedicated
 * BFF route that stamps ownership from the server session.
 * Auth endpoints never pass through this route, so browser code cannot obtain
 * a bearer token from it.
 */
async function handle(request: Request) {
  if (!methods.has(request.method)) return responseError('Método não permitido.', 405);
  if (!['GET', 'HEAD'].includes(request.method) && !isSameOrigin(request)) {
    return responseError('Origem inválida.', 403);
  }

  const requestedPath = new URL(request.url).searchParams.get('path');
  if (!requestedPath || requestedPath.length > 8_192 || !requestedPath.startsWith('/')) {
    return responseError('Caminho inválido.', 400);
  }

  const resource = getResource(requestedPath);
  if (!resource) return responseError('Recurso não permitido.', 404);
  const isAdminResource = resource.kind === 'table'
    ? adminTables.has(resource.name)
    : adminRpc.has(resource.name);
  if (!isAdminResource) return responseError('Recurso não permitido.', 403);

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return responseError('Não autenticado.', 401);

  if (isAdminResource) {
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    if (adminError || isAdmin !== true) return responseError('Acesso administrativo necessário.', 403);
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return responseError('Sessão inválida.', 401);

  const upstream = new URL(requestedPath, process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const forwardHeaders = new Headers();
  for (const header of ['accept', 'content-type', 'prefer', 'range', 'x-client-info']) {
    const value = request.headers.get(header);
    if (value) forwardHeaders.set(header, value);
  }
  forwardHeaders.set('apikey', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  forwardHeaders.set('authorization', `Bearer ${session.access_token}`);

  const upstreamResponse = await fetch(upstream, {
    method: request.method,
    headers: forwardHeaders,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    cache: 'no-store',
  });
  const responseHeaders = new Headers();
  for (const header of ['content-type', 'content-range', 'range-unit', 'accept-ranges', 'preference-applied']) {
    const value = upstreamResponse.headers.get(header);
    if (value) responseHeaders.set(header, value);
  }
  responseHeaders.set('Cache-Control', 'no-store');
  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: responseHeaders });
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
