'use client';

import { currentConsent, newEventId, pushDataLayer } from '@/lib/analytics/dataLayer';

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

/**
 * Maps funnel events to the names Google Analytics and Google Ads recognise.
 * `add_to_cart` returns null because CartContext already reports the full GA4
 * add_to_cart (with items and value), so reporting it here would count twice.
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

/** Funnel events whose GA4 version carries an `ecommerce` object. */
const ECOMMERCE_EVENTS: ConversionEvent[] = ['product_view', 'checkout_started'];

/**
 * Pushes a funnel event to the dataLayer when the visitor accepted analytics
 * or marketing cookies. Which tag reads it is decided in Google Tag Manager,
 * from the consent flags announced by the GoogleTagManager component.
 */
export function trackConversionEvent(event: ConversionEvent, properties: EventProperties = {}) {
  if (typeof window === 'undefined') return;

  const consent = currentConsent();
  if (!consent.analytics && !consent.marketing) return;

  const googleEvent = ECOMMERCE_EVENTS.includes(event) ? toGoogleEvent(event, properties) : null;
  if (googleEvent) pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event,
    event_id: newEventId(),
    ...properties,
    ...(googleEvent ? { ecommerce: googleEvent.params } : {}),
  });
}
