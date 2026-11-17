import { createHash } from 'node:crypto';

export const META_PIXEL_ID = '1566575165487222';
export const META_GRAPH_VERSION = 'v23.0';
export const GA4_MEASUREMENT_ID = 'G-F5T9JS9VYQ';
export const SITE_URL = 'https://www.allvino.com.br';

/** Browser identifiers captured when the order is created, never later. */
export type TrackingContext = {
  fbp?: string;
  fbc?: string;
  ga_client_id?: string;
  ga_session_id?: string;
  client_ip?: string;
  user_agent?: string;
  source_url?: string;
  marketing_consent?: boolean;
  analytics_consent?: boolean;
  captured_at?: string;
};

export type PurchaseOrderItem = {
  product_id?: string | null;
  wine_id?: string | null;
  product_name?: string | null;
  quantity: number;
  unit_price: number | string;
};

export type PurchaseOrder = {
  id: string;
  user_id: string;
  total_amount: number | string;
  paid_at: string | null;
  payment_status: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  marketing_consent_at: string | null;
  meta_purchase_sent_at: string | null;
  ga4_purchase_sent_at: string | null;
  tracking_context: TrackingContext | null;
  order_items?: PurchaseOrderItem[] | null;
};

export function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function normalizeEmail(email: string | null | undefined) {
  const value = email?.trim().toLowerCase();
  return value && value.includes('@') ? value : null;
}

/** Meta expects digits only, with the country code. Brazilian numbers get 55 when missing. */
export function normalizePhone(phone: string | null | undefined) {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function splitName(fullName: string | null | undefined) {
  const parts = (fullName || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: null, last: null };
  return { first: parts[0], last: parts.length > 1 ? parts[parts.length - 1] : null };
}

function readCookie(cookieHeader: string, name: string) {
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

/** `_ga` looks like GA1.1.<random>.<timestamp>; GA4 wants the last two parts as client_id. */
export function parseGaClientId(cookieValue: string | undefined) {
  const parts = (cookieValue || '').split('.');
  return parts.length >= 4 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : undefined;
}

/** `_ga_<ID>` looks like GS1.1.<session_id>.<n>... or GS2.1.s<session_id>$o1... */
export function parseGaSessionId(cookieValue: string | undefined) {
  const match = (cookieValue || '').match(/^GS\d\.\d\.s?(\d+)/);
  return match ? match[1] : undefined;
}

export function buildTrackingContext(
  headers: Headers,
  consent: { marketing: boolean; analytics: boolean },
): TrackingContext {
  const cookies = headers.get('cookie') || '';
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const context: TrackingContext = {
    marketing_consent: consent.marketing,
    analytics_consent: consent.analytics,
    captured_at: new Date().toISOString(),
  };

  // Identifiers are only stored for the category the visitor accepted.
  if (consent.marketing) {
    context.fbp = readCookie(cookies, '_fbp');
    context.fbc = readCookie(cookies, '_fbc');
    context.client_ip = forwarded || headers.get('x-real-ip') || undefined;
    context.user_agent = headers.get('user-agent') || undefined;
    context.source_url = `${SITE_URL}/checkout`;
  }
  if (consent.analytics) {
    context.ga_client_id = parseGaClientId(readCookie(cookies, '_ga'));
    context.ga_session_id = parseGaSessionId(readCookie(cookies, `_ga_${GA4_MEASUREMENT_ID.replace('G-', '')}`));
  }

  return Object.fromEntries(Object.entries(context).filter(([, value]) => value !== undefined)) as TrackingContext;
}

function orderValue(order: PurchaseOrder) {
  return Math.round(Number(order.total_amount) * 100) / 100;
}

function orderItems(order: PurchaseOrder) {
  return (order.order_items || [])
    .map((item) => ({
      id: item.product_id || item.wine_id || '',
      name: item.product_name || undefined,
      quantity: Number(item.quantity) || 1,
      price: Number(item.unit_price) || 0,
    }))
    .filter((item) => item.id);
}

export function buildMetaPurchasePayload(order: PurchaseOrder, email: string | null, testEventCode?: string) {
  const context = order.tracking_context || {};
  const items = orderItems(order);
  const { first, last } = splitName(order.customer_name);
  const phone = normalizePhone(order.customer_phone);
  const normalizedEmail = normalizeEmail(email);

  const userData: Record<string, unknown> = {
    external_id: [sha256(order.user_id)],
    country: [sha256('br')],
  };
  if (normalizedEmail) userData.em = [sha256(normalizedEmail)];
  if (phone) userData.ph = [sha256(phone)];
  if (first) userData.fn = [sha256(first)];
  if (last) userData.ln = [sha256(last)];
  if (context.fbp) userData.fbp = context.fbp;
  if (context.fbc) userData.fbc = context.fbc;
  if (context.client_ip) userData.client_ip_address = context.client_ip;
  if (context.user_agent) userData.client_user_agent = context.user_agent;

  const paidAt = order.paid_at ? new Date(order.paid_at) : new Date();

  return {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(paidAt.getTime() / 1000),
        // Same id the order keeps in meta_purchase_event_id: Meta de-duplicates retries on it.
        event_id: order.id,
        action_source: 'website',
        event_source_url: context.source_url || `${SITE_URL}/checkout`,
        user_data: userData,
        custom_data: {
          currency: 'BRL',
          value: orderValue(order),
          order_id: order.id,
          content_type: 'product',
          num_items: items.reduce((total, item) => total + item.quantity, 0) || undefined,
          content_ids: items.length ? items.map((item) => item.id) : undefined,
          contents: items.length
            ? items.map((item) => ({ id: item.id, quantity: item.quantity, item_price: item.price }))
            : undefined,
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };
}

export function buildGa4PurchasePayload(order: PurchaseOrder) {
  const context = order.tracking_context || {};
  if (!context.ga_client_id) return null;

  const paidAtMicros = order.paid_at ? new Date(order.paid_at).getTime() * 1000 : undefined;
  const items = orderItems(order);

  return {
    client_id: context.ga_client_id,
    // GA4 only accepts back-dated events up to 72 hours old.
    ...(paidAtMicros && Date.now() * 1000 - paidAtMicros < 72 * 3600 * 1_000_000
      ? { timestamp_micros: paidAtMicros }
      : {}),
    events: [
      {
        name: 'purchase',
        params: {
          transaction_id: order.id,
          currency: 'BRL',
          value: orderValue(order),
          engagement_time_msec: 1,
          ...(context.ga_session_id ? { session_id: context.ga_session_id } : {}),
          items: items.map((item) => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
        },
      },
    ],
  };
}
