import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { createPagarmePaymentLink } from '@/lib/payments/pagarme';
import { auditSecurityEvent } from '@/lib/security/audit';
import { checkRateLimitDistributed, getClientKey, rateLimitResponse } from '@/lib/security/rateLimit';

const requestSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.enum(['Pix', 'Cartao (Link)']),
  installments: z.number().int().min(1).max(12).optional(),
});

type PaymentTransaction = {
  id: string;
  status: string;
  provider_payment_url: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const limit = await checkRateLimitDistributed(getClientKey(request, 'payment-checkout', user.id), 5, 60_000);
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter);

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados de pagamento inválidos.' }, { status: 400 });
  }

  const { orderId, paymentMethod } = parsed.data;
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,user_id,total_amount,payment_method,payment_status,status')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  if (order.status === 'cancelled' || order.payment_status === 'paid') {
    return NextResponse.json({ error: 'Este pedido não está disponível para pagamento.' }, { status: 409 });
  }

  if (order.payment_method !== paymentMethod) {
    return NextResponse.json({ error: 'A forma de pagamento não corresponde ao pedido.' }, { status: 409 });
  }

  const method = paymentMethod === 'Pix' ? 'pix' : 'credit_card';
  const installments = method === 'credit_card'
    ? Math.min(parsed.data.installments || 1, 3)
    : 1;
  const admin = createAdminClient();
  const { data: startedTransaction, error: beginError } = await admin.rpc('begin_pagarme_payment', {
    p_attempt_id: crypto.randomUUID(),
    p_order_id: order.id,
    p_user_id: user.id,
    p_method: method,
    p_installments: installments,
    p_capture_mode: 'immediate',
  });

  if (beginError || !startedTransaction) {
    auditSecurityEvent('payment.begin_failed', { userId: user.id, orderId, code: beginError?.code });
    return NextResponse.json({ error: 'Não foi possível iniciar o pagamento.' }, { status: 500 });
  }

  const transaction = startedTransaction as PaymentTransaction;
  if (transaction.status === 'waiting_payment' && transaction.provider_payment_url) {
    return NextResponse.json({ paymentUrl: transaction.provider_payment_url });
  }

  try {
    const paymentLink = await createPagarmePaymentLink({
      orderId: order.id,
      amountCents: Math.round(Number(order.total_amount) * 100),
      paymentMethod: method,
      installments,
    });
    const { error: completeError } = await admin.rpc('complete_pagarme_payment', {
      p_transaction_id: transaction.id,
      p_status: 'waiting_payment',
      p_provider_payment_link_id: paymentLink.id,
      p_payment_url: paymentLink.url,
      p_expires_at: paymentLink.expiresAt,
      p_provider_updated_at: new Date().toISOString(),
    });

    if (completeError) throw completeError;

    auditSecurityEvent('payment.checkout_created', { userId: user.id, orderId, method });
    return NextResponse.json({ paymentUrl: paymentLink.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha desconhecida ao criar o checkout.';
    await admin.rpc('complete_pagarme_payment', {
      p_transaction_id: transaction.id,
      p_status: 'failed',
      p_error_message: message.slice(0, 500),
      p_provider_updated_at: new Date().toISOString(),
    });
    auditSecurityEvent('payment.checkout_failed', { userId: user.id, orderId, method });
    return NextResponse.json({ error: 'Não foi possível abrir o checkout de pagamento. Tente novamente.' }, { status: 502 });
  }
}
