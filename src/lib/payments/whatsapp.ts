import {
  MAX_CARD_INSTALLMENTS,
  normalizeCardInstallments,
} from '@/lib/payments/terms';

export type CheckoutWhatsAppItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

export type CheckoutWhatsAppMessageInput = {
  orderId: string;
  customerName: string;
  customerPhone: string | null;
  items: CheckoutWhatsAppItem[];
  paymentMethod: 'Pix' | 'Cartao (Link)';
  installments?: number;
  deliveryType: string;
  deliveryAddress: string | null;
  deliveryZipCode: string | null;
  deliveryZoneName: string | null;
  deliveryEstimateDays: number | null;
  shippingFee: number;
  subtotal: number;
  discount: number;
  total: number;
  promotionCode: string | null;
};

export function formatCheckoutMoney(value: number) {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

export function buildCheckoutWhatsAppMessage(input: CheckoutWhatsAppMessageInput) {
  const installments = normalizeCardInstallments(input.total, input.installments);
  const lines = [
    '*NOVO PEDIDO - ALLVINO*',
    `*Pedido:* #${input.orderId.slice(0, 8).toUpperCase()}`,
    '',
    `*Cliente:* ${input.customerName}`,
    `*WhatsApp:* ${input.customerPhone || 'Não informado'}`,
    '',
    '*ITENS DO PEDIDO:*',
    ...input.items.map((item) => (
      `${item.quantity}x ${item.name} — ${formatCheckoutMoney(item.unitPrice)} cada (${formatCheckoutMoney(item.unitPrice * item.quantity)})`
    )),
    '',
  ];

  if (input.paymentMethod === 'Cartao (Link)') {
    lines.push(
      '*Pagamento:* Cartão de crédito via link',
      `*Parcelamento solicitado:* ${installments}x sem juros`,
      `*Valor por parcela:* ${formatCheckoutMoney(input.total / installments)}`,
      `_Condição: até ${MAX_CARD_INSTALLMENTS}x sem juros, sem valor mínimo de pedido._`
    );
  } else {
    lines.push('*Pagamento:* PIX — 5% de desconto aplicado, aguardando confirmação');
  }

  lines.push('', `*Modalidade:* ${input.deliveryType}`);

  if (input.deliveryAddress) lines.push(`*Endereço:* ${input.deliveryAddress}`);
  if (input.deliveryZipCode) lines.push(`*CEP:* ${input.deliveryZipCode}`);
  if (input.deliveryZoneName) lines.push(`*Região de entrega:* ${input.deliveryZoneName}`);
  lines.push(
    input.deliveryEstimateDays
      ? `*Prazo:* até ${input.deliveryEstimateDays} dia(s)`
      : '*Prazo:* a combinar com a loja'
  );

  if (input.deliveryAddress || input.deliveryZipCode || input.deliveryZoneName) {
    lines.push(`*Frete:* ${input.shippingFee > 0 ? formatCheckoutMoney(input.shippingFee) : 'Grátis'}`);
  }

  if (input.promotionCode) lines.push(`*Cupom:* ${input.promotionCode}`);

  lines.push('', `*Subtotal:* ${formatCheckoutMoney(input.subtotal)}`);
  if (input.discount > 0) lines.push(`*Descontos:* - ${formatCheckoutMoney(input.discount)}`);
  lines.push(`*VALOR TOTAL: ${formatCheckoutMoney(input.total)}*`);

  if (input.paymentMethod === 'Cartao (Link)') {
    lines.push('', 'Por favor, envie o link de pagamento do cartão para este pedido.');
  } else {
    lines.push('', 'Pedido gerado para pagamento via PIX. Enviarei o comprovante após o pagamento.');
  }

  return lines.join('\n');
}

export function buildWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = phone.replace(/\D/g, '');
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
