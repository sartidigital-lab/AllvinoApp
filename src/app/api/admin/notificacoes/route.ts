import webpush from 'web-push';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { isSameOrigin, pushSubscriptionSchema } from '@/lib/push/subscription';

export const runtime = 'nodejs';

const campaignSchema = z.object({
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(5).max(200),
  url: z.string().trim().regex(/^\/(?!\/)[^\s]*$/).max(200),
  mode: z.enum(['test', 'campaign']).default('campaign'),
});

async function getAdmin() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { supabase, user: null };
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  return { supabase, user: !adminError && isAdmin === true ? user : null };
}

export async function GET() {
  const { supabase, user } = await getAdmin();
  if (!user) return Response.json({ error: 'Acesso restrito.' }, { status: 403 });
  const { count, error } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true });
  if (error) return Response.json({ error: 'Não foi possível consultar as assinaturas.' }, { status: 500 });
  const { count: ownCount, error: ownError } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (ownError) return Response.json({ error: 'Não foi possível consultar os dispositivos de teste.' }, { status: 500 });
  return Response.json({ count: count ?? 0, ownCount: ownCount ?? 0, configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY), preview: process.env.VERCEL_ENV === 'preview' }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const { supabase, user } = await getAdmin();
  if (!user) return Response.json({ error: 'Acesso restrito.' }, { status: 403 });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return Response.json({ error: 'Configure as chaves VAPID antes de enviar.' }, { status: 503 });

  const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Preencha título, mensagem e caminho válidos.' }, { status: 400 });
  const isTest = parsed.data.mode === 'test';
  if (!isTest && process.env.VERCEL_ENV === 'preview') {
    return Response.json({ error: 'Campanhas gerais estão disponíveis somente em produção.' }, { status: 403 });
  }
  const limit = await checkRateLimitDistributed(getClientKey(request, isTest ? 'admin-push-test' : 'admin-push-send', user.id), isTest ? 5 : 3, 600_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const query = supabase.from('push_subscriptions').select('id,endpoint,p256dh,auth_secret');
  const scopedQuery = isTest ? query.eq('user_id', user.id) : query;
  const { data: rows, error } = await scopedQuery.order('created_at', { ascending: true }).limit(isTest ? 1 : 501);
  if (error) return Response.json({ error: 'Não foi possível consultar as assinaturas.' }, { status: 500 });
  if (!rows?.length) return Response.json({ error: isTest ? 'Ative as notificações neste dispositivo antes do teste.' : 'Nenhum dispositivo inscrito.' }, { status: 409 });
  if (rows.length > 500) return Response.json({ error: 'Limite de 500 dispositivos por campanha. Divida o envio antes de prosseguir.' }, { status: 409 });

  webpush.setVapidDetails('https://allvino.com.br', publicKey, privateKey);
  const payload = JSON.stringify({ title: parsed.data.title, body: parsed.data.body, url: new URL(parsed.data.url, 'https://allvino.com.br').pathname + new URL(parsed.data.url, 'https://allvino.com.br').search });
  let sent = 0;
  let failed = 0;
  let expired = 0;

  for (let offset = 0; offset < rows.length; offset += 20) {
    await Promise.all(rows.slice(offset, offset + 20).map(async (row) => {
      const subscription = pushSubscriptionSchema.safeParse({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth_secret } });
      if (!subscription.success) { failed += 1; return; }
      try {
        await webpush.sendNotification(subscription.data, payload, { TTL: 3600, urgency: 'normal' });
        sent += 1;
      } catch (sendError) {
        const statusCode = (sendError as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          const { error: deleteError } = await supabase.from('push_subscriptions').delete().eq('id', row.id);
          if (deleteError) console.error('push subscription cleanup failed', { code: deleteError.code });
          expired += 1;
        } else {
          console.error('push delivery failed', { statusCode });
          failed += 1;
        }
      }
    }));
  }

  return Response.json({ sent, failed, expired }, { headers: { 'Cache-Control': 'no-store' } });
}
