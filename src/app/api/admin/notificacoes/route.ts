import webpush from 'web-push';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';
import { isSameOrigin, pushSubscriptionSchema } from '@/lib/push/subscription';

export const runtime = 'nodejs';

const optionalMoney = z.preprocess(
  (value) => value === '' || value === null ? undefined : value,
  z.coerce.number().finite().min(0).optional()
);

const campaignSchema = z.object({
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(5).max(200),
  url: z.string().trim().regex(/^\/(?!\/)[^\s]*$/).max(200),
  mode: z.enum(['test', 'campaign']).default('campaign'),
  audience: z.enum(['full', 'ticket']).default('full'),
  ticketMin: optionalMoney,
  ticketMax: optionalMoney,
}).superRefine((value, context) => {
  if (value.audience === 'ticket' && value.ticketMin === undefined && value.ticketMax === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe ao menos um limite de ticket médio.' });
  }
  if (value.ticketMin !== undefined && value.ticketMax !== undefined && value.ticketMin > value.ticketMax) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'O ticket mínimo não pode superar o máximo.' });
  }
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

  const { data: audience, error } = await supabase.rpc('get_notification_audience');
  if (error) return Response.json({ error: 'Não foi possível carregar a base de usuários.' }, { status: 500 });
  const { count: ownCount, error: ownError } = await supabase.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (ownError) return Response.json({ error: 'Não foi possível consultar os dispositivos de teste.' }, { status: 500 });

  const users = Array.isArray(audience) ? audience : [];
  const count = users.reduce((total, item) => total + Number(item.device_count || 0), 0);
  return Response.json({ count, ownCount: ownCount ?? 0, configured: Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY), preview: process.env.VERCEL_ENV === 'preview', users }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: 'Origem inválida.' }, { status: 403 });
  const { supabase, user } = await getAdmin();
  if (!user) return Response.json({ error: 'Acesso restrito.' }, { status: 403 });

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return Response.json({ error: 'Configure as chaves VAPID antes de enviar.' }, { status: 503 });

  const parsed = campaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Preencha título, mensagem, caminho e segmento válidos.' }, { status: 400 });
  const isTest = parsed.data.mode === 'test';
  if (!isTest && process.env.VERCEL_ENV === 'preview') {
    return Response.json({ error: 'Campanhas gerais estão disponíveis somente em produção.' }, { status: 403 });
  }
  const limit = await checkRateLimitDistributed(getClientKey(request, isTest ? 'admin-push-test' : 'admin-push-send', user.id), isTest ? 5 : 3, 600_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const query = supabase.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth_secret');
  let rows: Array<{ id: string; user_id: string; endpoint: string; p256dh: string; auth_secret: string }> | null = null;
  let error: { code?: string } | null = null;

  if (isTest) {
    ({ data: rows, error } = await query.eq('user_id', user.id).order('created_at', { ascending: true }).limit(1));
  } else if (parsed.data.audience === 'ticket') {
    const { data: audience, error: audienceError } = await supabase.rpc('get_notification_audience', {
      p_ticket_min: parsed.data.ticketMin ?? null,
      p_ticket_max: parsed.data.ticketMax ?? null,
    });
    if (audienceError) return Response.json({ error: 'Não foi possível calcular o segmento por ticket médio.' }, { status: 500 });

    const userIds = (audience || [])
      .filter((item) => item.notifications_enabled && item.has_orders)
      .map((item) => item.user_id as string);
    if (userIds.length === 0) return Response.json({ error: 'Nenhum dispositivo habilitado corresponde a esse ticket médio.' }, { status: 409 });
    ({ data: rows, error } = await query.in('user_id', userIds).order('created_at', { ascending: true }).limit(501));
  } else {
    ({ data: rows, error } = await query.order('created_at', { ascending: true }).limit(501));
  }

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
