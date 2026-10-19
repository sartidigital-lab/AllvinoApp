import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export type PagarmeWebhookEvent = {
  id?: string;
  type?: string;
  created_at?: string;
  account?: { id?: string };
  data?: {
    id?: string;
    code?: string;
    status?: string;
    updated_at?: string;
    charges?: Array<{
      id?: string;
      status?: string;
      payment_method?: string;
      last_transaction?: { id?: string };
    }>;
  };
};

export function verifyPagarmeWebhookSignature(rawBody: string, signature: string | null, key: string) {
  if (!signature || !key) return false;

  const received = signature.replace(/^sha1=/i, '').trim();
  const expected = createHmac('sha1', key).update(rawBody, 'utf8').digest('hex');
  if (received.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(received, 'utf8'), Buffer.from(expected, 'utf8'));
}

export function mapPagarmeWebhookStatus(event: PagarmeWebhookEvent) {
  switch (event.type) {
    case 'order.paid':
    case 'charge.paid':
      return 'paid';
    case 'charge.pending':
    case 'charge.processing':
      return 'waiting_payment';
    case 'order.payment_failed':
    case 'charge.payment_failed':
      return 'failed';
    case 'charge.refunded':
      return 'refunded';
    case 'checkout.canceled':
    case 'order.canceled':
      return 'cancelled';
    default:
      return null;
  }
}
