'use client';

import { isCookieCategoryAllowed, readCookieConsent } from '@/lib/privacy/cookieConsent';

/**
 * The site's only contact with tracking. It tells Google Tag Manager what
 * happened and what the visitor accepted; every pixel and tag (Meta Pixel,
 * GA4, Google Ads) lives in the GTM container, not in this code.
 */
export type DataLayerEntry = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type TrackingConsent = { analytics: boolean; marketing: boolean };

export function pushDataLayer(entry: DataLayerEntry) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(entry);
}

/** Same id on every push, so a tag that reports the event twice can be de-duplicated. */
export function newEventId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

export function currentConsent(): TrackingConsent {
  if (typeof document === 'undefined') return { analytics: false, marketing: false };
  const consent = readCookieConsent(document.cookie);
  return {
    analytics: isCookieCategoryAllowed(consent, 'analytics'),
    marketing: isCookieCategoryAllowed(consent, 'marketing'),
  };
}
