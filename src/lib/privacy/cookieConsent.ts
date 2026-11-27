export const COOKIE_CONSENT_COOKIE_NAME = 'allvino_cookie_consent';
export const COOKIE_CONSENT_PREFERENCES_EVENT = 'allvino:manage-cookie-preferences';

export type CookieConsentCategories = {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
};

export type CookieConsent = {
  version: 1;
  categories: CookieConsentCategories;
};

export const DEFAULT_COOKIE_CATEGORIES: CookieConsentCategories = {
  necessary: true,
  preferences: false,
  analytics: false,
  marketing: false,
};

export function createCookieConsent(categories: Partial<CookieConsentCategories> = {}): CookieConsent {
  return {
    version: 1,
    categories: {
      necessary: true,
      preferences: categories.preferences === true,
      analytics: categories.analytics === true,
      marketing: categories.marketing === true,
    },
  };
}

export function serializeCookieConsent(consent: CookieConsent) {
  return encodeURIComponent(JSON.stringify(consent));
}

export function parseCookieConsent(value: string | null | undefined): CookieConsent | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<CookieConsent>;
    const categories = parsed.categories;
    if (
      parsed.version !== 1 ||
      !categories ||
      categories.necessary !== true ||
      typeof categories.preferences !== 'boolean' ||
      typeof categories.analytics !== 'boolean' ||
      typeof categories.marketing !== 'boolean'
    ) {
      return null;
    }

    return createCookieConsent(categories);
  } catch {
    return null;
  }
}

export function readCookieConsent(cookieString: string): CookieConsent | null {
  const encodedConsent = cookieString
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`))
    ?.slice(COOKIE_CONSENT_COOKIE_NAME.length + 1);

  return parseCookieConsent(encodedConsent);
}

export function saveCookieConsent(consent: CookieConsent) {
  if (typeof document === 'undefined') return;

  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${serializeCookieConsent(consent)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

/**
 * Decision of the site owner (26/11/2026): measurement (analytics) and
 * marketing run for every visitor, with no consent banner. Every tracking
 * path asks `isCookieCategoryAllowed`, so this one switch controls them all.
 * To require the visitor's choice again, set it to true and put
 * `CookieConsentBanner` back in `CustomerOnlyExperience`.
 */
export const TRACKING_REQUIRES_CONSENT = false;

export function isCookieCategoryAllowed(consent: CookieConsent | null, category: keyof CookieConsentCategories) {
  if (category === 'necessary') return true;
  if (!TRACKING_REQUIRES_CONSENT && (category === 'analytics' || category === 'marketing')) return true;
  return consent?.categories[category] === true;
}
