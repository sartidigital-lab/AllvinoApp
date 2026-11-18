'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsent,
} from '@/lib/privacy/cookieConsent';
import {
  ATTRIBUTION_COOKIE,
  ATTRIBUTION_MAX_AGE_SECONDS,
  extractTouch,
  mergeAttribution,
  readAttributionCookie,
  serializeAttribution,
  type AttributionTouch,
} from '@/lib/analytics/attribution';

const COOKIE_CONSENT_CHANGED_EVENT = 'allvino:cookie-consent';

function consentAllowsAttribution(consent: CookieConsent | null) {
  return isCookieCategoryAllowed(consent, 'analytics') || isCookieCategoryAllowed(consent, 'marketing');
}

function saveTouch(touch: AttributionTouch) {
  const merged = mergeAttribution(readAttributionCookie(document.cookie), touch);
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ATTRIBUTION_COOKIE}=${serializeAttribution(merged)}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/**
 * Remembers which ad or campaign brought the visitor (UTM tags, gclid, fbclid)
 * so the order can carry it later. Nothing is stored before the visitor
 * accepts analytics or marketing cookies; a touch seen earlier is kept in
 * memory only and saved once consent is given.
 */
export function AttributionCapture() {
  const pathname = usePathname();
  const pendingTouch = useRef<AttributionTouch | null>(null);

  useEffect(() => {
    const touch = extractTouch(window.location.search, window.location.pathname);
    if (!touch) return;

    if (consentAllowsAttribution(readCookieConsent(document.cookie))) saveTouch(touch);
    else pendingTouch.current = touch;
  }, [pathname]);

  useEffect(() => {
    const handleConsent = (event: Event) => {
      const consent = event instanceof CustomEvent
        ? event.detail as CookieConsent
        : readCookieConsent(document.cookie);
      if (!consentAllowsAttribution(consent) || !pendingTouch.current) return;

      saveTouch(pendingTouch.current);
      pendingTouch.current = null;
    };

    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsent);
  }, []);

  return null;
}
