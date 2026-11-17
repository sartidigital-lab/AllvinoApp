import { describe, expect, it } from 'vitest';
import {
  buildGa4PurchasePayload,
  buildMetaPurchasePayload,
  buildTrackingContext,
  normalizePhone,
  parseGaClientId,
  parseGaSessionId,
  sha256,
  type PurchaseOrder,
} from '@/lib/analytics/purchaseEvents';
import { toGoogleEvent } from '@/lib/analytics/conversionEvents';

const order: PurchaseOrder = {
  id: '4a3ea111-0000-4000-8000-000000000001',
  user_id: '9f9f9f9f-0000-4000-8000-000000000002',
  total_amount: '359.10',
  paid_at: new Date().toISOString(),
  payment_status: 'paid',
  customer_name: 'Maria da Silva Souza',
  customer_phone: '(27) 99277-0952',
  marketing_consent_at: new Date().toISOString(),
  meta_purchase_sent_at: null,
  ga4_purchase_sent_at: null,
  tracking_context: {
    fbp: 'fb.2.1700000000000.123',
    fbc: 'fb.2.1700000000000.abc',
    client_ip: '203.0.113.9',
    user_agent: 'Mozilla/5.0',
    ga_client_id: '1138176980.1794356985',
    ga_session_id: '1794950000',
    analytics_consent: true,
  },
  order_items: [{ product_id: 'p1', product_name: 'Malbec', quantity: 2, unit_price: 179.55 }],
};

describe('Meta Purchase payload', () => {
  it('uses the order id as event_id and hashes personal data', () => {
    const payload = buildMetaPurchasePayload(order, 'Maria@Exemplo.com ');
    const event = payload.data[0];

    expect(event.event_name).toBe('Purchase');
    expect(event.event_id).toBe(order.id);
    expect(event.action_source).toBe('website');
    expect(event.custom_data.currency).toBe('BRL');
    expect(event.custom_data.value).toBe(359.1);
    expect(event.custom_data.num_items).toBe(2);
    expect(event.user_data.em).toEqual([sha256('maria@exemplo.com')]);
    expect(event.user_data.ph).toEqual([sha256('5527992770952')]);
    expect(event.user_data.fn).toEqual([sha256('maria')]);
    expect(event.user_data.ln).toEqual([sha256('souza')]);
    expect(event.user_data.fbp).toBe('fb.2.1700000000000.123');
    expect(JSON.stringify(payload)).not.toContain('maria@exemplo.com');
  });

  it('omits missing identifiers and adds the test code only when given', () => {
    const bare = { ...order, tracking_context: null, customer_phone: null, customer_name: null };
    const payload = buildMetaPurchasePayload(bare, null, 'TEST123');
    const userData = payload.data[0].user_data;

    expect(userData.em).toBeUndefined();
    expect(userData.ph).toBeUndefined();
    expect(userData.fbp).toBeUndefined();
    expect(payload.test_event_code).toBe('TEST123');
    expect(buildMetaPurchasePayload(order, null)).not.toHaveProperty('test_event_code');
  });
});

describe('GA4 purchase payload', () => {
  it('sends transaction_id, value and the original client and session', () => {
    const payload = buildGa4PurchasePayload(order);

    expect(payload?.client_id).toBe('1138176980.1794356985');
    expect(payload?.events[0].name).toBe('purchase');
    expect(payload?.events[0].params.transaction_id).toBe(order.id);
    expect(payload?.events[0].params.value).toBe(359.1);
    expect(payload?.events[0].params.session_id).toBe('1794950000');
  });

  it('returns null when no GA client id was captured', () => {
    expect(buildGa4PurchasePayload({ ...order, tracking_context: { analytics_consent: true } })).toBeNull();
  });
});

describe('tracking context', () => {
  const headers = new Headers({
    cookie: '_fbp=fb.2.1.2; _fbc=fb.2.1.fbclid; _ga=GA1.1.111.222; _ga_F5T9JS9VYQ=GS2.1.s333$o1$g1',
    'x-forwarded-for': '203.0.113.9, 10.0.0.1',
    'user-agent': 'UA',
  });

  it('stores only identifiers for the accepted categories', () => {
    const none = buildTrackingContext(headers, { marketing: false, analytics: false });
    expect(none.fbp).toBeUndefined();
    expect(none.ga_client_id).toBeUndefined();
    expect(none.client_ip).toBeUndefined();

    const all = buildTrackingContext(headers, { marketing: true, analytics: true });
    expect(all.fbp).toBe('fb.2.1.2');
    expect(all.client_ip).toBe('203.0.113.9');
    expect(all.ga_client_id).toBe('111.222');
    expect(all.ga_session_id).toBe('333');
  });

  it('parses GA cookies and Brazilian phones', () => {
    expect(parseGaClientId('GA1.1.1138176980.1794356985')).toBe('1138176980.1794356985');
    expect(parseGaSessionId('GS1.1.1794950000.1.1.1794950001.0')).toBe('1794950000');
    expect(normalizePhone('27992770952')).toBe('5527992770952');
    expect(normalizePhone('123')).toBeNull();
  });
});

describe('Google event mapping', () => {
  it('uses GA4 standard names and avoids a second add_to_cart', () => {
    expect(toGoogleEvent('add_to_cart', {})).toBeNull();
    expect(toGoogleEvent('checkout_started', { cart_total: 100, item_count: 2 })?.name).toBe('begin_checkout');
    expect(toGoogleEvent('product_view', { product_id: 'p1' })?.name).toBe('view_item');
    expect(toGoogleEvent('order_created', { order_id: 'x' })?.name).toBe('order_created');
  });
});
