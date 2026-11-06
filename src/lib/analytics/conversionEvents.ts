'use client';

import { isCookieCategoryAllowed, readCookieConsent } from '@/lib/privacy/cookieConsent';

export type ConversionEvent =
  | 'catalog_view'
  | 'promotion_selected'
  | 'product_view'
  | 'add_to_cart'
  | 'cart_opened'
  | 'checkout_started'
  | 'checkout_auth_required'
  | 'order_submission_started'
  | 'order_created';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (command: 'event', event: string, parameters?: Record<string, unknown>) => void;
  }
}

/** Emits only consented, non-identifying funnel signals for the configured analytics destination. */
export function trackConversionEvent(event: ConversionEvent, properties: EventProperties = {}) {
  if (typeof window === 'undefined' || !isCookieCategoryAllowed(readCookieConsent(document.cookie), 'analytics')) return;
  const payload = { event, ...properties };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
  window.gtag?.('event', event, properties);
  window.dispatchEvent(new CustomEvent('allvino:conversion', { detail: payload }));
}
