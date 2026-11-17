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

/**
 * Maps funnel events to the names Google Analytics and Google Ads recognise.
 * `add_to_cart` returns null because CartContext already sends the full GA4
 * add_to_cart (with items and value), so sending it here would count twice.
 */
export function toGoogleEvent(
  event: ConversionEvent,
  properties: EventProperties,
): { name: string; params: Record<string, unknown> } | null {
  if (event === 'add_to_cart') return null;

  if (event === 'product_view') {
    return {
      name: 'view_item',
      params: {
        currency: 'BRL',
        items: [{ item_id: properties.product_id, item_category: properties.product_kind }],
      },
    };
  }

  if (event === 'checkout_started') {
    return {
      name: 'begin_checkout',
      params: {
        currency: 'BRL',
        value: typeof properties.cart_total === 'number' ? properties.cart_total : undefined,
        num_items: properties.item_count,
      },
    };
  }

  return { name: event, params: properties };
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
    const googleEvent = toGoogleEvent(event, properties);
    if (googleEvent) window.gtag?.('event', googleEvent.name, googleEvent.params);
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
