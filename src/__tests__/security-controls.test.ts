import { describe, expect, it } from 'vitest';
import { safeInternalRedirect } from '@/lib/auth/safeRedirect';
import { checkRateLimit } from '@/lib/security/rateLimit';
import { checkoutRequestSchema } from '@/lib/validation/checkout';

describe('security controls', () => {
  it('allows only known internal redirects', () => {
    expect(safeInternalRedirect('/checkout')).toBe('/checkout');
    expect(safeInternalRedirect('/conta?tab=orders')).toBe('/conta?tab=orders');
    expect(safeInternalRedirect('https://evil.example')).toBe('/');
    expect(safeInternalRedirect('//evil.example')).toBe('/');
    expect(safeInternalRedirect('/admin/users')).toBe('/');
  });

  it('rejects oversized or malformed checkout payloads', () => {
    const valid = {
      cartItems: [{ id: '11111111-1111-4111-8111-111111111111', name: 'Vinho', quantity: 1 }],
      deliveryMethod: 'Retirada na Loja',
      paymentMethod: 'Pix',
    };

    expect(checkoutRequestSchema.safeParse(valid).success).toBe(true);
    expect(checkoutRequestSchema.safeParse({ ...valid, cartItems: [{ ...valid.cartItems[0], quantity: 51 }] }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...valid, deliveryAddress: 'x'.repeat(501) }).success).toBe(false);
    expect(checkoutRequestSchema.safeParse({ ...valid, deliveryZipCode: '123' }).success).toBe(false);
  });

  it('limits repeated requests within a window', () => {
    const key = `test:${crypto.randomUUID()}`;
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000).allowed).toBe(false);
  });
});
