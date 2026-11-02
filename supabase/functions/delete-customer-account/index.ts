import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const allowedOrigins = new Set([
  'https://allvino.com.br',
  'https://www.allvino.com.br',
  'http://localhost:3000',
]);

function getCorsHeaders(request: Request) {
  const origin = request.headers.get('Origin');
  const allowedOrigin = origin && (allowedOrigins.has(origin) || /^https:\/\/allvino-app(?:-[a-z0-9-]+)?\.vercel\.app$/i.test(origin))
    ? origin
    : 'https://www.allvino.com.br';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function json(request: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: getCorsHeaders(request) });
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }

  if (request.method !== 'POST') {
    return json(request, 405, { error: 'Método não permitido.' });
  }

  const authorization = request.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!authorization?.startsWith('Bearer ') || !serviceRoleKey || !supabaseUrl) {
    return json(request, 401, { error: 'Não autorizado.' });
  }

  let body: { userId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json(request, 400, { error: 'Corpo da solicitação inválido.' });
  }

  if (!isUuid(body.userId)) {
    return json(request, 400, { error: 'Cliente inválido.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const token = authorization.slice('Bearer '.length);
  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);

  if (callerError || !callerData.user) {
    return json(request, 401, { error: 'Sessão inválida.' });
  }

  if (callerData.user.id === body.userId) {
    return json(request, 403, { error: 'Administradores não podem excluir a própria conta por esta função.' });
  }

  const { data: administrator, error: administratorError } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', callerData.user.id)
    .eq('ativo', true)
    .maybeSingle();

  if (administratorError || !administrator) {
    return json(request, 403, { error: 'Apenas administradores ativos podem excluir contas.' });
  }

  const { data: targetAdministrator, error: targetAdministratorError } = await supabaseAdmin
    .from('admin_users')
    .select('id')
    .eq('id', body.userId)
    .maybeSingle();

  if (targetAdministratorError || targetAdministrator) {
    return json(request, 403, { error: 'Contas administrativas não podem ser excluídas por esta função.' });
  }

  const tablesToDelete = ['payment_transactions', 'customer_conversation_messages', 'customer_conversations', 'customer_crm_cards', 'perfis'];
  for (const table of tablesToDelete) {
    const userIdColumn = table === 'perfis' ? 'id' : table === 'customer_conversation_messages' ? 'created_by' : 'user_id';
    const { error } = await supabaseAdmin.from(table).delete().eq(userIdColumn, body.userId);
    if (error) {
      console.error(`Could not delete ${table}`, error.code);
      return json(request, 500, { error: 'Não foi possível remover os dados vinculados.' });
    }
  }

  const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(body.userId, false);
  if (deleteUserError) {
    console.error('Could not delete user', deleteUserError.code);
    return json(request, 500, { error: 'Não foi possível excluir a conta.' });
  }

  return json(request, 200, { deleted: true });
});
