export type PaymentCheckoutMethod = 'Pix' | 'Cartao (Link)';

export async function createPaymentCheckout(
  orderId: string,
  paymentMethod: PaymentCheckoutMethod,
  installments?: number
) {
  try {
    const response = await fetch('/api/pagamentos/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paymentMethod, installments }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Não foi possível iniciar o pagamento.');
    return { paymentUrl: payload.paymentUrl as string, error: null };
  } catch (error) {
    return { paymentUrl: null, error: error as Error };
  }
}
