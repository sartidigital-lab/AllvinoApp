import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildPagarmePaymentLinkPayload } from '@/lib/payments/pagarme';
import { mapPagarmeWebhookStatus, verifyPagarmeWebhookSignature } from '@/lib/payments/pagarmeWebhook';

describe('Pagar.me hosted checkout', () => {
  beforeEach(() => {
    vi.stubEnv('PAGARME_PAYMENT_LINK_EXPIRES_IN_MINUTES', '30');
  });

  it('creates a Pix-only checkout for the exact order amount', () => {
    const payload = buildPagarmePaymentLinkPayload({
      orderId: '12345678-0000-4000-8000-000000000000',
      amountCents: 15490,
      paymentMethod: 'pix',
      installments: 1,
    });

    expect(payload.order_code).toBe('12345678-0000-4000-8000-000000000000');
    expect(payload.max_paid_sessions).toBe(1);
    expect(payload.payment_settings).toEqual({
      accepted_payment_methods: ['pix'],
      pix_settings: { expires_in: 1800 },
    });
    expect(payload.cart_settings.items).toEqual([
      expect.objectContaining({ amount: 15490, default_quantity: 1 }),
    ]);
  });

  it('offers the configured interest-free credit-card installments', () => {
    const payload = buildPagarmePaymentLinkPayload({
      orderId: '12345678-0000-4000-8000-000000000000',
      amountCents: 33000,
      paymentMethod: 'credit_card',
      installments: 3,
    });

    expect(payload.payment_settings).toEqual({
      accepted_payment_methods: ['credit_card'],
      credit_card_settings: {
        operation_type: 'auth_and_capture',
        installments_setup: { interest_type: 'simple' },
        installments: [
          { number: 1, total: 33000 },
          { number: 2, total: 33000 },
          { number: 3, total: 33000 },
        ],
      },
    });
  });

  it('accepts only a valid webhook signature and maps final payment events', () => {
    const rawBody = '{"id":"hook_test","type":"order.paid"}';
    const key = 'sk_test_example';
    const signature = `sha1=${createHmac('sha1', key).update(rawBody, 'utf8').digest('hex')}`;

    expect(verifyPagarmeWebhookSignature(rawBody, signature, key)).toBe(true);
    expect(verifyPagarmeWebhookSignature(rawBody, signature, 'another-key')).toBe(false);
    expect(mapPagarmeWebhookStatus({ type: 'order.paid' })).toBe('paid');
    expect(mapPagarmeWebhookStatus({ type: 'charge.refunded' })).toBe('refunded');
    expect(mapPagarmeWebhookStatus({ type: 'checkout.closed' })).toBeNull();
  });
});
