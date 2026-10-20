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

function safeCompare(left: string, right: string) {
  const leftBytes = Buffer.from(left, 'utf8');
  const rightBytes = Buffer.from(right, 'utf8');
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export function verifyPagarmeWebhookBasicAuth(
  authorization: string | null,
  expectedUsername: string,
  expectedPassword: string,
) {
  if (!authorization || !expectedUsername || !expectedPassword) return false;

  const match = authorization.match(/^Basic\s+([A-Za-z0-9+/]+={0,2})$/i);
  if (!match) return false;

  let credentials: string;
  try {
    credentials = Buffer.from(match[1], 'base64').toString('utf8');
  } catch {
    return false;
  }

  const separator = credentials.indexOf(':');
  if (separator < 0) return false;

  const username = credentials.slice(0, separator);
  const password = credentials.slice(separator + 1);
  return safeCompare(username, expectedUsername) && safeCompare(password, expectedPassword);
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
