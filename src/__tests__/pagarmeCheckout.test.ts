import { createHmac } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { buildPagarmePaymentLinkPayload, createPagarmePaymentLink, PagarmePaymentLinkError } from '@/lib/payments/pagarme';
import {
  mapPagarmeWebhookStatus,
  verifyPagarmeWebhookBasicAuth,
  verifyPagarmeWebhookSignature,
} from '@/lib/payments/pagarmeWebhook';

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
        installments: [
          { number: 1, total: 33000 },
          { number: 2, total: 33000 },
          { number: 3, total: 33000 },
        ],
      },
    });
    expect(payload.payment_settings.credit_card_settings).not.toHaveProperty('installments_setup');
  });

  it('captures sanitized provider diagnostics when payment-link creation fails', async () => {
    vi.stubEnv('PAGARME_SECRET_KEY', 'sk_test_do_not_log');
    vi.stubEnv('PAGARME_BASE_URL', 'https://api.pagar.me/core/v5');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      errors: [{
        code: 'invalid_parameter',
        parameter: 'payment_settings.credit_card_settings',
        message: 'Invalid value for customer teste@example.com, document 12345678901',
      }],
    }), {
      status: 422,
      headers: { 'x-request-id': 'req_test_123' },
    })));

    await expect(createPagarmePaymentLink({
      orderId: '12345678-0000-4000-8000-000000000000',
      amountCents: 33000,
      paymentMethod: 'credit_card',
      installments: 3,
    })).rejects.toMatchObject({
      name: 'PagarmePaymentLinkError',
      message: 'Não foi possível criar o checkout de pagamento.',
      httpStatus: 422,
      errorCode: 'invalid_parameter',
      requestId: 'req_test_123',
      providerErrors: [{
        code: 'invalid_parameter',
        parameter: 'payment_settings.credit_card_settings',
        message: 'Invalid value for customer [email], document [number]',
      }],
    });
  });

  it('parses and sanitizes RFC Problem Details validation maps', async () => {
    vi.stubEnv('PAGARME_SECRET_KEY', 'sk_test_do_not_log');
    vi.stubEnv('PAGARME_BASE_URL', 'https://sdx-api.pagar.me/core/v5');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        'payment_settings.credit_card_settings.installments': [
          'Invalid value for customer cliente.teste@example.com, document 12345678901',
        ],
      },
    }), { status: 400 })));

    let caughtError: unknown;
    await createPagarmePaymentLink({
      orderId: '12345678-0000-4000-8000-000000000000',
      amountCents: 33000,
      paymentMethod: 'credit_card',
      installments: 3,
    }).catch((cause: unknown) => { caughtError = cause; });

    expect(caughtError).toBeInstanceOf(PagarmePaymentLinkError);
    const error = caughtError as PagarmePaymentLinkError;
    expect(error.providerErrors).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: 'One or more validation errors occurred.' }),
      expect.objectContaining({
        parameter: 'payment_settings.credit_card_settings.installments',
        message: 'Invalid value for customer [email], document [number]',
      }),
    ]));
    expect(JSON.stringify(error.providerErrors)).not.toContain('https://tools.ietf.org');
    expect(JSON.stringify(error.providerErrors)).not.toContain('cliente.teste@example.com');
    expect(JSON.stringify(error.providerErrors)).not.toContain('12345678901');
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

  it('validates configured webhook Basic Auth credentials without accepting missing or wrong credentials', () => {
    const authorization = `Basic ${Buffer.from('allvino-webhook:local-test-password').toString('base64')}`;

    expect(verifyPagarmeWebhookBasicAuth(authorization, 'allvino-webhook', 'local-test-password')).toBe(true);
    expect(verifyPagarmeWebhookBasicAuth(null, 'allvino-webhook', 'local-test-password')).toBe(false);
    expect(verifyPagarmeWebhookBasicAuth(authorization, 'allvino-webhook', 'wrong-password')).toBe(false);
    expect(verifyPagarmeWebhookBasicAuth('Bearer token', 'allvino-webhook', 'local-test-password')).toBe(false);
  });
});
