import { describe, expect, it } from 'vitest';
import {
  TRACKING_REQUIRES_CONSENT,
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
    expect(isCookieCategoryAllowed(parsed, 'marketing')).toBe(true);
  });

  describe('owner decision: tracking does not wait for a visitor choice', () => {
    it('is switched off by the single TRACKING_REQUIRES_CONSENT constant', () => {
      expect(TRACKING_REQUIRES_CONSENT).toBe(false);
    });

    it('allows analytics and marketing with no stored choice', () => {
      expect(isCookieCategoryAllowed(null, 'analytics')).toBe(true);
      expect(isCookieCategoryAllowed(null, 'marketing')).toBe(true);
    });

    it('allows analytics and marketing even when an old banner choice refused them', () => {
      const refused = createCookieConsent({});
      expect(isCookieCategoryAllowed(refused, 'analytics')).toBe(true);
      expect(isCookieCategoryAllowed(refused, 'marketing')).toBe(true);
    });

    it('does not widen any other category', () => {
      expect(isCookieCategoryAllowed(null, 'preferences')).toBe(false);
      expect(isCookieCategoryAllowed(createCookieConsent({ preferences: true }), 'preferences')).toBe(true);
    });
  });
});
