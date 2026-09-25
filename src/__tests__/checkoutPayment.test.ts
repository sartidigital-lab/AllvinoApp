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
import { buildCheckoutWhatsAppMessage, buildWhatsAppUrl } from '@/lib/payments/whatsapp';

describe('provisional checkout payments', () => {
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

  it('includes installments, items, delivery, freight and totals in the card message', () => {
    const message = buildCheckoutWhatsAppMessage({
      orderId: '12345678-0000-0000-0000-000000000000',
      customerName: 'Cliente Teste',
      customerPhone: '27999999999',
      items: [{ name: 'Vinho Teste', quantity: 2, unitPrice: 160 }],
      paymentMethod: 'Cartao (Link)',
      installments: 3,
      deliveryType: 'Entrega no Endereco',
      deliveryAddress: 'Rua Teste, 10',
      deliveryZipCode: '29000-000',
      deliveryZoneName: 'Vitória',
      deliveryEstimateDays: 2,
      shippingFee: 15,
      subtotal: 320,
      discount: 5,
      total: 330,
      promotionCode: 'TESTE5',
    });

    expect(message).toContain('*Parcelamento solicitado:* 3x sem juros');
    expect(message).toContain('*Valor por parcela:* R$ 110,00');
    expect(message).toContain('2x Vinho Teste');
    expect(message).toContain('*Endereço:* Rua Teste, 10');
    expect(message).toContain('*Prazo:* até 2 dia(s)');
    expect(message).toContain('*Frete:* R$ 15,00');
    expect(message).toContain('*VALOR TOTAL: R$ 330,00*');
    expect(buildWhatsAppUrl('55 (27) 99999-9999', message)).toMatch(/^https:\/\/wa\.me\/5527999999999\?text=/);
  });

  it('offers up to 3 interest-free card installments without a minimum order', () => {
    expect(getCardInstallmentOptions(19.9)).toEqual([1, 2, 3]);
    expect(getCardInstallmentOptions(599)).toEqual([1, 2, 3]);
    expect(normalizeCardInstallments(550, 6)).toBe(3);
    expect(normalizeCardInstallments(900, 12)).toBe(3);
  });

  it('applies 5% Pix discount and includes the complete order in the WhatsApp message', () => {
    expect(calculatePixDiscount(154.9)).toBe(7.75);

    const message = buildCheckoutWhatsAppMessage({
      orderId: '87654321-0000-0000-0000-000000000000',
      customerName: 'Cliente PIX',
      customerPhone: '27988888888',
      items: [{ name: 'Vinho PIX', quantity: 1, unitPrice: 150 }],
      paymentMethod: 'Pix',
      deliveryType: 'Entrega no endereço',
      deliveryAddress: 'Av. Teste, 20',
      deliveryZipCode: '29000-100',
      deliveryZoneName: 'Vitória',
      deliveryEstimateDays: 3,
      shippingFee: 12,
      subtotal: 150,
      discount: 15,
      total: 147.25,
      promotionCode: null,
    });

    expect(message).toContain('*Pagamento:* PIX — 5% de desconto aplicado');
    expect(message).toContain('1x Vinho PIX');
    expect(message).toContain('*Endereço:* Av. Teste, 20');
    expect(message).toContain('*Prazo:* até 3 dia(s)');
    expect(message).toContain('*Frete:* R$ 12,00');
    expect(message).toContain('*Descontos:* - R$ 7,75');
    expect(message).toContain('*VALOR TOTAL: R$ 147,00*');
  });
});
