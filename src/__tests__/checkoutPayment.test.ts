import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env.mjs', () => ({
  env: {
    NEXT_PUBLIC_PIX_KEY: 'b753a86b-3878-47fc-8de7-2ab8c5b711bb',
    NEXT_PUBLIC_PIX_MERCHANT_NAME: 'ALLVINO',
    NEXT_PUBLIC_PIX_MERCHANT_CITY: 'VITORIA',
  },
}));

import { createPixPayload } from '@/lib/payments/pix';
import {
  calculatePixDiscount,
  getCardInstallmentOptions,
  normalizeCardInstallments,
} from '@/lib/payments/terms';
describe('checkout payment terms', () => {
  it('creates a valid Pix payload with amount and CRC', () => {
    const payload = createPixPayload(154.9, {
      key: 'b753a86b-3878-47fc-8de7-2ab8c5b711bb',
      merchantName: 'ALLVINO',
      merchantCity: 'VITORIA',
    });

    expect(payload).toContain('BR.GOV.BCB.PIX');
    expect(payload).toContain('154.90');
    expect(payload).toMatch(/6304[0-9A-F]{4}$/);
  });

  it('offers up to 3 interest-free card installments without a minimum order', () => {
    expect(getCardInstallmentOptions(19.9)).toEqual([1, 2, 3]);
    expect(getCardInstallmentOptions(599)).toEqual([1, 2, 3]);
    expect(normalizeCardInstallments(550, 6)).toBe(3);
    expect(normalizeCardInstallments(900, 12)).toBe(3);
  });

  it('applies the 5% Pix discount', () => {
    expect(calculatePixDiscount(154.9)).toBe(7.75);
  });
});
