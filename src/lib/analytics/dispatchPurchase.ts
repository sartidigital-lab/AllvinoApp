import { createAdminClient } from '@/utils/supabase/admin';
import { auditSecurityEvent } from '@/lib/security/audit';
import {
  buildGa4PurchasePayload,
  buildMetaPurchasePayload,
  GA4_MEASUREMENT_ID,
  META_GRAPH_VERSION,
  META_PIXEL_ID,
  type PurchaseOrder,
} from '@/lib/analytics/purchaseEvents';

type AdminClient = ReturnType<typeof createAdminClient>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUEST_TIMEOUT_MS = 6000;

const ORDER_COLUMNS = [
  'id', 'user_id', 'total_amount', 'paid_at', 'payment_status', 'customer_name', 'customer_phone',
  'marketing_consent_at', 'meta_purchase_sent_at', 'ga4_purchase_sent_at', 'tracking_context',
  'order_items(product_id,wine_id,product_name,quantity,unit_price)',
].join(',');

async function sendMetaPurchase(admin: AdminClient, order: PurchaseOrder) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!accessToken) return 'skipped_no_token';
  if (order.meta_purchase_sent_at) return 'already_sent';
  // Without the marketing choice recorded at checkout there is no basis to send personal data.
  if (!order.marketing_consent_at) return 'skipped_no_consent';

  const pixelId = process.env.META_PIXEL_ID?.trim() || META_PIXEL_ID;
  const { data: userResult } = await admin.auth.admin.getUserById(order.user_id);
  const payload = buildMetaPurchasePayload(
    order,
    userResult?.user?.email ?? null,
    process.env.META_TEST_EVENT_CODE?.trim() || undefined,
  );

  const response = await fetch(
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    auditSecurityEvent('tracking.meta_purchase_failed', {
      orderId: order.id,
      status: response.status,
      detail: detail.slice(0, 300),
    });
    return 'failed';
  }

  await admin
    .from('orders')
    .update({ meta_purchase_event_id: order.id, meta_purchase_sent_at: new Date().toISOString() })
    .eq('id', order.id);
  auditSecurityEvent('tracking.meta_purchase_sent', { orderId: order.id });
  return 'sent';
}

async function sendGa4Purchase(admin: AdminClient, order: PurchaseOrder) {
  const apiSecret = process.env.GA4_API_SECRET?.trim();
  if (!apiSecret) return 'skipped_no_secret';
  if (order.ga4_purchase_sent_at) return 'already_sent';
  if (!order.tracking_context?.analytics_consent) return 'skipped_no_consent';

  const payload = buildGa4PurchasePayload(order);
  if (!payload) return 'skipped_no_client_id';

  const measurementId = process.env.GA4_MEASUREMENT_ID?.trim() || GA4_MEASUREMENT_ID;
  const response = await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    auditSecurityEvent('tracking.ga4_purchase_failed', { orderId: order.id, status: response.status });
    return 'failed';
  }

  await admin.from('orders').update({ ga4_purchase_sent_at: new Date().toISOString() }).eq('id', order.id);
  auditSecurityEvent('tracking.ga4_purchase_sent', { orderId: order.id });
  return 'sent';
}

/**
 * Sends the Purchase event to Meta (Conversions API) and Google Analytics 4
 * once Pagar.me confirms payment. Safe to call for every paid webhook: each
 * destination records its own sent-at column and is skipped afterwards.
 * Never throws, so a tracking problem cannot make the payment webhook fail.
 */
export async function dispatchPurchaseTracking(admin: AdminClient, orderCode: string | null | undefined) {
  if (!orderCode || !UUID_PATTERN.test(orderCode)) return null;

  try {
    const { data, error } = await admin.from('orders').select(ORDER_COLUMNS).eq('id', orderCode).maybeSingle();
    const order = data as unknown as PurchaseOrder | null;
    if (error || !order || order.payment_status !== 'paid') return null;

    const [meta, ga4] = await Promise.all([
      sendMetaPurchase(admin, order).catch((caught) => {
        auditSecurityEvent('tracking.meta_purchase_error', { orderId: order.id, name: caught instanceof Error ? caught.name : 'unknown' });
        return 'error';
      }),
      sendGa4Purchase(admin, order).catch((caught) => {
        auditSecurityEvent('tracking.ga4_purchase_error', { orderId: order.id, name: caught instanceof Error ? caught.name : 'unknown' });
        return 'error';
      }),
    ]);
    return { meta, ga4 };
  } catch (caught) {
    auditSecurityEvent('tracking.dispatch_error', { orderId: orderCode, name: caught instanceof Error ? caught.name : 'unknown' });
    return null;
  }
}
