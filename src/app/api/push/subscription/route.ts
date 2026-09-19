import { createClient } from '@/utils/supabase/server';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { isSameOrigin, pushSubscriptionSchema } from '@/lib/push/subscription';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return Response.json({ error: 'Notificações indisponíveis no momento.' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Entre na sua conta para ativar notificações.' }, { status: 401 });

  const limit = await checkRateLimitDistributed(getClientKey(request, 'push-subscribe', user.id), 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const parsed = pushSubscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Assinatura de push inválida.' }, { status: 400 });

  const { endpoint, keys } = parsed.data;
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth_secret: keys.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' });

  if (error) {
    console.error('push subscription save failed', { code: error.code });
    return Response.json({ error: 'Não foi possível salvar a assinatura.' }, { status: error.code === '23505' ? 409 : 500 });
  }
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return Response.json({ error: 'Não autenticado.' }, { status: 401 });

  const limit = await checkRateLimitDistributed(getClientKey(request, 'push-unsubscribe', user.id), 10, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);
  const parsed = pushSubscriptionSchema.pick({ endpoint: true }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Assinatura inválida.' }, { status: 400 });
  const { error } = await supabase.from('push_subscriptions')
    .delete().eq('user_id', user.id).eq('endpoint', parsed.data.endpoint);
  if (error) return Response.json({ error: 'Não foi possível remover a assinatura.' }, { status: 500 });
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
