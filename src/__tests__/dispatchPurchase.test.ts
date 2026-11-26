import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/security/audit', () => ({ auditSecurityEvent: vi.fn() }));

import { dispatchPurchaseTracking } from '@/lib/analytics/dispatchPurchase';

const ORDER_ID = '4a3ea111-0000-4000-8000-000000000001';

type Row = Record<string, unknown>;

/**
 * In-memory stand-in for the parts of the Supabase admin client the dispatch
 * uses. The conditional update (`.is(column, null)`) behaves like Postgres:
 * the first caller changes the row, any later caller matches nothing.
 */
function fakeAdmin(initial: Row) {
  const row: Row = { ...initial };

  const admin = {
    row,
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'maria@exemplo.com' } } }) } },
    from: (table: string) => {
      expect(table).toBe('orders');
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: { ...row }, error: null }) }),
        }),
        update: (values: Row) => {
          const filters: Array<[string, unknown]> = [];
          const run = async (returning: boolean) => {
            const matches = filters.every(([column, expected]) => (expected === null ? row[column] == null : row[column] === expected));
            if (matches) Object.assign(row, values);
            return { data: returning ? (matches ? [{ id: row.id }] : []) : null, error: null };
          };
          const chain = {
            eq: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
            is: (column: string, value: unknown) => { filters.push([column, value]); return chain; },
            select: () => run(true),
            then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => run(false).then(resolve, reject),
          };
          return chain;
        },
      };
    },
  };
  return admin;
}

const paidOrder = (): Row => ({
  id: ORDER_ID,
  user_id: '9f9f9f9f-0000-4000-8000-000000000002',
  total_amount: '359.10',
  paid_at: new Date().toISOString(),
  payment_status: 'paid',
  customer_name: 'Maria da Silva',
  customer_phone: '(27) 99277-0952',
  marketing_consent_at: new Date().toISOString(),
  meta_purchase_sent_at: null,
  meta_purchase_event_id: null,
  ga4_purchase_sent_at: null,
  tracking_context: { analytics_consent: true, ga_client_id: '1138176980.1794356985' },
  order_items: [],
});

describe('dispatchPurchaseTracking', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    process.env.META_CAPI_ACCESS_TOKEN = 'test-token';
    process.env.GA4_API_SECRET = 'test-secret';
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.META_CAPI_ACCESS_TOKEN;
    delete process.env.GA4_API_SECRET;
  });

  const callsTo = (host: string) => fetchMock.mock.calls.filter(([url]) => String(url).includes(host));

  it('sends Meta and GA4 once when order.paid and charge.paid arrive together', async () => {
    const admin = fakeAdmin(paidOrder());

    await Promise.all([
      dispatchPurchaseTracking(admin as never, ORDER_ID),
      dispatchPurchaseTracking(admin as never, ORDER_ID),
    ]);

    expect(callsTo('graph.facebook.com')).toHaveLength(1);
    expect(callsTo('google-analytics.com')).toHaveLength(1);
    expect(admin.row.meta_purchase_sent_at).toBeTruthy();
    expect(admin.row.meta_purchase_event_id).toBe(ORDER_ID);
    expect(admin.row.ga4_purchase_sent_at).toBeTruthy();
  });

  it('does not send again for a later delivery of the same paid order', async () => {
    const admin = fakeAdmin(paidOrder());

    await dispatchPurchaseTracking(admin as never, ORDER_ID);
    await dispatchPurchaseTracking(admin as never, ORDER_ID);

    expect(callsTo('graph.facebook.com')).toHaveLength(1);
    expect(callsTo('google-analytics.com')).toHaveLength(1);
  });

  it('releases the claim when Meta rejects the request so the next delivery can retry', async () => {
    const admin = fakeAdmin(paidOrder());
    fetchMock.mockImplementation(async (url: string) => (
      String(url).includes('graph.facebook.com')
        ? { ok: false, status: 500, text: async () => 'boom' }
        : { ok: true, text: async () => '' }
    ));

    const first = await dispatchPurchaseTracking(admin as never, ORDER_ID);
    expect(first?.meta).toBe('failed');
    expect(admin.row.meta_purchase_sent_at).toBeNull();

    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    const second = await dispatchPurchaseTracking(admin as never, ORDER_ID);
    expect(second?.meta).toBe('sent');
    expect(callsTo('graph.facebook.com')).toHaveLength(2);
    expect(admin.row.meta_purchase_sent_at).toBeTruthy();
  });

  it('releases the claim when the request throws', async () => {
    const admin = fakeAdmin(paidOrder());
    fetchMock.mockImplementation(async (url: string) => {
      if (String(url).includes('graph.facebook.com')) throw new Error('network down');
      return { ok: true, text: async () => '' };
    });

    const result = await dispatchPurchaseTracking(admin as never, ORDER_ID);
    expect(result?.meta).toBe('error');
    expect(admin.row.meta_purchase_sent_at).toBeNull();
  });

  it('skips Meta when the customer gave no marketing consent', async () => {
    const admin = fakeAdmin({ ...paidOrder(), marketing_consent_at: null });

    const result = await dispatchPurchaseTracking(admin as never, ORDER_ID);

    expect(result?.meta).toBe('skipped_no_consent');
    expect(callsTo('graph.facebook.com')).toHaveLength(0);
  });
});
