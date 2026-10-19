import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import {
  mapPagarmeWebhookStatus,
  type PagarmeWebhookEvent,
  verifyPagarmeWebhookSignature,
} from '@/lib/payments/pagarmeWebhook';
import { auditSecurityEvent } from '@/lib/security/audit';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signingKey = process.env.PAGARME_WEBHOOK_SIGNING_KEY?.trim()
    || process.env.PAGARME_SECRET_KEY?.trim()
    || '';

  if (!verifyPagarmeWebhookSignature(rawBody, request.headers.get('x-hub-signature'), signingKey)) {
    auditSecurityEvent('payment.webhook_rejected', { reason: 'invalid_signature' });
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 });
  }

  let event: PagarmeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PagarmeWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  if (!event.id || !event.type || !event.account?.id) {
    return NextResponse.json({ error: 'Evento incompleto.' }, { status: 400 });
  }

  const charge = event.data?.charges?.[0];
  const admin = createAdminClient();
  const { error } = await admin.rpc('process_pagarme_webhook', {
    p_event_id: event.id,
    p_event_type: event.type,
    p_account_id: event.account.id,
    p_payload_hash: createHash('sha256').update(rawBody, 'utf8').digest('hex'),
    p_status: mapPagarmeWebhookStatus(event),
    p_order_code: event.data?.code || null,
    p_provider_order_id: event.data?.id || null,
    p_provider_charge_id: charge?.id || null,
    p_provider_transaction_id: charge?.last_transaction?.id || null,
    p_provider_event_at: event.data?.updated_at || event.created_at || null,
  });

  if (error) {
    auditSecurityEvent('payment.webhook_failed', { eventId: event.id, eventType: event.type, code: error.code });
    return NextResponse.json({ error: 'Não foi possível processar o evento.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
