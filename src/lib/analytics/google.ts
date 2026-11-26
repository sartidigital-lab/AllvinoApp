import type { Wine } from '@/types/database';
import { currentConsent, newEventId, pushDataLayer } from '@/lib/analytics/dataLayer';

/**
 * Reports the GA4 add_to_cart with items and value. The event name differs
 * from the funnel's `add_to_cart` on purpose: that one feeds the Meta Pixel,
 * this one feeds GA4, so each tag fires once.
 */
export function trackAddToCart(wine: Wine) {
  if (typeof window === 'undefined') return;
  if (!currentConsent().analytics) return;

  pushDataLayer({ ecommerce: null });
  pushDataLayer({
    event: 'add_to_cart_ecommerce',
    event_id: newEventId(),
    ecommerce: {
      currency: 'BRL',
      value: wine.price,
      items: [{
        item_id: wine.id,
        item_name: wine.name,
        item_category: wine.category || undefined,
        price: wine.price,
        quantity: 1,
      }],
    },
  });
}
