import { describe, expect, it } from 'vitest';
import {
  createCookieConsent,
  isCookieCategoryAllowed,
  parseCookieConsent,
  readCookieConsent,
  serializeCookieConsent,
} from '@/lib/privacy/cookieConsent';

describe('cookie consent', () => {
  it('preserves selected optional categories in the consent cookie', () => {
    const consent = createCookieConsent({ preferences: true, analytics: true });
    expect(parseCookieConsent(serializeCookieConsent(consent))).toEqual(consent);
  });

  it('rejects malformed consent values', () => {
    expect(parseCookieConsent('not-a-valid-consent')).toBeNull();
    expect(parseCookieConsent(encodeURIComponent(JSON.stringify({ version: 1, categories: { necessary: false } })))).toBeNull();
  });

  it('reads consent from a browser cookie string and keeps necessary cookies enabled', () => {
    const consent = createCookieConsent({ marketing: true });
    const stored = `theme=dark; allvino_cookie_consent=${serializeCookieConsent(consent)}`;
    const parsed = readCookieConsent(stored);

    expect(parsed).toEqual(consent);
    expect(isCookieCategoryAllowed(parsed, 'necessary')).toBe(true);
    expect(isCookieCategoryAllowed(parsed, 'analytics')).toBe(false);
    expect(isCookieCategoryAllowed(parsed, 'marketing')).toBe(true);
  });
});
