import { describe, expect, it } from 'vitest';
import {
  ATTRIBUTION_COOKIE,
  buildFbcFromTouch,
  classifyChannel,
  extractTouch,
  mergeAttribution,
  parseAttribution,
  readAttributionCookie,
  serializeAttribution,
} from '@/lib/analytics/attribution';
import { buildTrackingContext } from '@/lib/analytics/purchaseEvents';

const NOW = 1_794_960_000_000;

describe('attribution capture', () => {
  it('reads UTM tags and click ids from a query string', () => {
    const touch = extractTouch(
      '?utm_source=facebook&utm_medium=paid_social&utm_campaign=BLACK%20FRIDAY%20%7C%20VENDAS&fbclid=IwAR123abc',
      '/catalogo/abc',
      NOW,
    );

    expect(touch).toMatchObject({
      utm_source: 'facebook',
      utm_medium: 'paid_social',
      utm_campaign: 'BLACK FRIDAY | VENDAS',
      fbclid: 'IwAR123abc',
      landing: '/catalogo/abc',
      at: NOW,
    });
  });

  it('ignores pages without marketing parameters and unsafe values', () => {
    expect(extractTouch('?cupom=BLACK', '/checkout', NOW)).toBeNull();
    expect(extractTouch('?utm_source=<script>alert(1)</script>', '/', NOW)).toBeNull();
    expect(extractTouch(`?utm_campaign=${'x'.repeat(400)}`, '/', NOW)?.utm_campaign).toHaveLength(150);
  });

  it('keeps the first touch and replaces the last one', () => {
    const first = extractTouch('?gclid=G1', '/', NOW)!;
    const second = extractTouch('?utm_source=facebook&fbclid=F1', '/', NOW + 1000)!;
    const merged = mergeAttribution(mergeAttribution(null, first), second);

    expect(merged.first?.gclid).toBe('G1');
    expect(merged.last?.fbclid).toBe('F1');
    expect(mergeAttribution(merged, null)).toEqual(merged);
  });

  it('round-trips through the cookie and rejects tampered data', () => {
    const attribution = mergeAttribution(null, extractTouch('?gclid=G1&utm_source=google', '/', NOW));
    const cookie = `other=1; ${ATTRIBUTION_COOKIE}=${serializeAttribution(attribution)}`;

    expect(readAttributionCookie(cookie)?.last?.gclid).toBe('G1');
    expect(parseAttribution('not-json')).toBeNull();
    expect(parseAttribution(encodeURIComponent('{"last":{"utm_source":"<b>x</b>"}}'))).toBeNull();
  });
});

describe('sales channel', () => {
  it('detects Google Ads by gclid and Meta by fbclid or utm_source', () => {
    expect(classifyChannel({ last: { gclid: 'G1' } })).toBe('google_ads');
    expect(classifyChannel({ last: { gbraid: 'B1' } })).toBe('google_ads');
    expect(classifyChannel({ last: { fbclid: 'F1' } })).toBe('meta_ads');
    expect(classifyChannel({ last: { utm_source: 'Instagram', utm_medium: 'paid_social' } })).toBe('meta_ads');
    expect(classifyChannel({ last: { utm_source: 'google', utm_medium: 'cpc' } })).toBe('google_ads');
    expect(classifyChannel({ last: { utm_source: 'news', utm_medium: 'cpc' } })).toBe('outro_pago');
  });

  it('falls back to the first touch, then to direct or organic', () => {
    expect(classifyChannel({ first: { fbclid: 'F1' }, last: { utm_source: 'newsletter' } })).toBe('meta_ads');
    expect(classifyChannel(null)).toBe('direto_ou_organico');
    expect(classifyChannel({ last: { utm_source: 'newsletter', utm_medium: 'email' } })).toBe('direto_ou_organico');
  });

  it('rebuilds the Meta click cookie from the fbclid', () => {
    expect(buildFbcFromTouch({ fbclid: 'F1', at: NOW })).toBe(`fb.2.${NOW}.F1`);
    expect(buildFbcFromTouch({ gclid: 'G1' })).toBeUndefined();
  });
});

describe('tracking context attribution', () => {
  const attribution = mergeAttribution(null, extractTouch('?fbclid=F1&utm_source=facebook', '/catalogo', NOW));
  const headers = new Headers({
    cookie: `${ATTRIBUTION_COOKIE}=${serializeAttribution(attribution)}; _ga=GA1.1.111.222`,
  });

  it('stores the source only when the visitor accepted a cookie category', () => {
    const none = buildTrackingContext(headers, { marketing: false, analytics: false });
    expect(none.attribution).toBeUndefined();
    expect(none.channel).toBeUndefined();

    const marketing = buildTrackingContext(headers, { marketing: true, analytics: false });
    expect(marketing.channel).toBe('meta_ads');
    expect(marketing.fbc).toBe(`fb.2.${NOW}.F1`);
    expect(marketing.attribution?.last?.utm_source).toBe('facebook');
  });

  it('marks a visit without tags as direct or organic', () => {
    const plain = buildTrackingContext(new Headers({ cookie: '_ga=GA1.1.111.222' }), { marketing: true, analytics: true });
    expect(plain.channel).toBe('direto_ou_organico');
    expect(plain.attribution).toBeUndefined();
  });
});
