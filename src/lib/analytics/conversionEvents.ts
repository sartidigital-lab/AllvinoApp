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

export type MetaConversionEvent = {
  id: string;
  name: ConversionEvent;
  properties: EventProperties;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    allvinoMetaEventQueue?: MetaConversionEvent[];
  }
}

/** Emits only consented, non-identifying funnel signals for the configured analytics destination. */
export function trackConversionEvent(event: ConversionEvent, properties: EventProperties = {}) {
  if (typeof window === 'undefined') return;

  const consent = readCookieConsent(document.cookie);
  const analyticsAllowed = isCookieCategoryAllowed(consent, 'analytics');
  const marketingAllowed = isCookieCategoryAllowed(consent, 'marketing');
  if (!analyticsAllowed && !marketingAllowed) return;

  const payload = { event, ...properties };
  if (analyticsAllowed) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    window.gtag?.('event', event, properties);
  }

  if (marketingAllowed) {
    const metaEvent: MetaConversionEvent = {
      id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      name: event,
      properties,
    };
    window.allvinoMetaEventQueue = [...(window.allvinoMetaEventQueue || []), metaEvent];
    window.dispatchEvent(new CustomEvent<MetaConversionEvent>('allvino:conversion', { detail: metaEvent }));
  }
}
