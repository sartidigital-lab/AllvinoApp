/**
 * First-party record of where a visit came from (UTM tags and ad click ids).
 * It works in the browser and on the server, so a sale can be traced back to
 * Google Ads or Meta Ads even when a platform reports it differently.
 *
 * Everything read from the URL is untrusted input: values are trimmed, limited
 * to a safe character set and only ever stored as data.
 */

export const ATTRIBUTION_COOKIE = 'allvino_attr';
export const ATTRIBUTION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const TOUCH_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'utm_id',
  'gclid',
  'gbraid',
  'wbraid',
  'fbclid',
] as const;

export type TouchKey = (typeof TOUCH_KEYS)[number];

export type AttributionTouch = Partial<Record<TouchKey, string>> & {
  /** Path where the visitor landed, without the query string. */
  landing?: string;
  /** When this touch was captured, in milliseconds since the epoch. */
  at?: number;
};

export type Attribution = {
  first?: AttributionTouch;
  last?: AttributionTouch;
};

export type SalesChannel = 'google_ads' | 'meta_ads' | 'outro_pago' | 'direto_ou_organico';

const MAX_VALUE_LENGTH = 150;
const MAX_COOKIE_LENGTH = 1800;

function cleanValue(value: string | null | undefined) {
  const text = (value || '').trim().slice(0, MAX_VALUE_LENGTH);
  // Letters, digits and the punctuation ad platforms use in names and click ids.
  return /^[\p{L}\p{N}\s._~%+|:/\-{}]+$/u.test(text) ? text : '';
}

/** Reads the marketing parameters from a query string. Returns null when there are none. */
export function extractTouch(search: string, landingPath = '', now = Date.now()): AttributionTouch | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const touch: AttributionTouch = {};

  for (const key of TOUCH_KEYS) {
    const value = cleanValue(params.get(key));
    if (value) touch[key] = value;
  }
  if (Object.keys(touch).length === 0) return null;

  const landing = cleanValue(landingPath);
  if (landing) touch.landing = landing;
  touch.at = now;
  return touch;
}

/** Keeps the first touch forever and replaces the last touch with the newest one. */
export function mergeAttribution(current: Attribution | null, touch: AttributionTouch | null): Attribution {
  const base = current || {};
  if (!touch) return base;
  return { first: base.first || touch, last: touch };
}

export function serializeAttribution(attribution: Attribution) {
  let encoded = encodeURIComponent(JSON.stringify(attribution));
  if (encoded.length > MAX_COOKIE_LENGTH) {
    // Too long for a cookie: keep only the newest touch.
    encoded = encodeURIComponent(JSON.stringify({ first: attribution.last, last: attribution.last }));
  }
  return encoded;
}

function sanitizeTouch(value: unknown): AttributionTouch | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const touch: AttributionTouch = {};
  for (const key of TOUCH_KEYS) {
    const clean = typeof source[key] === 'string' ? cleanValue(source[key] as string) : '';
    if (clean) touch[key] = clean;
  }
  if (typeof source.landing === 'string') {
    const landing = cleanValue(source.landing);
    if (landing) touch.landing = landing;
  }
  if (typeof source.at === 'number' && Number.isFinite(source.at)) touch.at = source.at;
  return Object.keys(touch).length > 0 ? touch : undefined;
}

export function parseAttribution(cookieValue: string | null | undefined): Attribution | null {
  if (!cookieValue) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as Record<string, unknown>;
    const first = sanitizeTouch(parsed.first);
    const last = sanitizeTouch(parsed.last);
    return first || last ? { first, last } : null;
  } catch {
    return null;
  }
}

export function readAttributionCookie(cookieString: string) {
  const entry = cookieString
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ATTRIBUTION_COOKIE}=`));
  return parseAttribution(entry?.slice(ATTRIBUTION_COOKIE.length + 1));
}

const META_SOURCES = new Set(['facebook', 'fb', 'instagram', 'ig', 'meta', 'an', 'messenger']);
const PAID_MEDIUMS = new Set(['cpc', 'ppc', 'paid', 'paid_social', 'paidsocial', 'paid-social', 'display', 'cpm']);

function classifyTouch(touch: AttributionTouch | undefined): SalesChannel | null {
  if (!touch) return null;
  if (touch.gclid || touch.gbraid || touch.wbraid) return 'google_ads';
  const source = (touch.utm_source || '').toLowerCase();
  const medium = (touch.utm_medium || '').toLowerCase();
  if (touch.fbclid || META_SOURCES.has(source)) return 'meta_ads';
  if (source === 'google' && PAID_MEDIUMS.has(medium)) return 'google_ads';
  if (PAID_MEDIUMS.has(medium)) return 'outro_pago';
  return null;
}

/** Last paid touch wins; with no paid signal the sale counts as direct or organic. */
export function classifyChannel(attribution: Attribution | null): SalesChannel {
  return classifyTouch(attribution?.last) || classifyTouch(attribution?.first) || 'direto_ou_organico';
}

/** Meta's click id cookie value, for when the pixel could not create `_fbc` itself. */
export function buildFbcFromTouch(touch: AttributionTouch | undefined) {
  if (!touch?.fbclid) return undefined;
  // fb.<domain level>.<click time in ms>.<fbclid>; www.allvino.com.br is level 2.
  return `fb.2.${touch.at || Date.now()}.${touch.fbclid}`;
}
