import type { Wine } from '@/types/database';

export function trackAddToCart(wine: Wine) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'add_to_cart', {
    currency: 'BRL',
    value: wine.price,
    items: [{
      item_id: wine.id,
      item_name: wine.name,
      item_category: wine.category || undefined,
      price: wine.price,
      quantity: 1,
    }],
  });
}
