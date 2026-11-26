import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/catalogo' }));
vi.mock('next/script', () => ({
  default: ({ id }: { id?: string }) => <div data-testid={`script-${id}`} />,
}));

import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import { trackConversionEvent } from '@/lib/analytics/conversionEvents';
import { trackAddToCart } from '@/lib/analytics/google';
import {
  COOKIE_CONSENT_COOKIE_NAME,
  createCookieConsent,
  saveCookieConsent,
} from '@/lib/privacy/cookieConsent';
import type { Wine } from '@/types/database';

const wine = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Vinho de teste',
  price: 99,
  category: 'Argentina',
} as Wine;

const entries = () => (window.dataLayer ?? []) as Array<Record<string, unknown>>;
const events = () => entries().map((entry) => entry.event).filter(Boolean);

function consent(categories: { analytics?: boolean; marketing?: boolean }) {
  saveCookieConsent(createCookieConsent(categories));
}

describe('dataLayer tracking', () => {
  beforeEach(() => {
    window.dataLayer = [];
    document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0`;
  });

  afterEach(() => {
    window.dataLayer = undefined;
  });

  describe('trackConversionEvent', () => {
    it('reports nothing before the visitor accepts any cookie category', () => {
      trackConversionEvent('catalog_view', { product_count: 3 });

      expect(entries()).toHaveLength(0);
    });

    it('pushes the funnel event with an id and its properties', () => {
      consent({ marketing: true });

      trackConversionEvent('catalog_view', { product_count: 3 });

      expect(entries()).toHaveLength(1);
      expect(entries()[0]).toMatchObject({ event: 'catalog_view', product_count: 3 });
      expect(typeof entries()[0].event_id).toBe('string');
    });

    it('attaches an ecommerce object to begin_checkout and view_item sources, clearing the previous one first', () => {
      consent({ analytics: true });

      trackConversionEvent('checkout_started', { cart_total: 120, item_count: 2 });

      expect(entries()[0]).toEqual({ ecommerce: null });
      expect(entries()[1]).toMatchObject({
        event: 'checkout_started',
        cart_total: 120,
        ecommerce: { currency: 'BRL', value: 120, num_items: 2 },
      });
    });

    it('never calls the pixel or gtag directly', () => {
      const fbq = vi.fn();
      const gtag = vi.fn();
      Object.assign(window, { fbq, gtag });
      consent({ analytics: true, marketing: true });

      trackConversionEvent('add_to_cart', { product_id: 'p1' });

      expect(fbq).not.toHaveBeenCalled();
      expect(gtag).not.toHaveBeenCalled();
      Object.assign(window, { fbq: undefined, gtag: undefined });
    });
  });

  describe('trackAddToCart', () => {
    it('does not report without analytics consent', () => {
      consent({ marketing: true });

      trackAddToCart(wine);

      expect(entries()).toHaveLength(0);
    });

    it('pushes the GA4 add_to_cart with items and value as its own event name', () => {
      consent({ analytics: true });

      trackAddToCart(wine);

      expect(entries()[0]).toEqual({ ecommerce: null });
      expect(entries()[1]).toMatchObject({
        event: 'add_to_cart_ecommerce',
        ecommerce: {
          currency: 'BRL',
          value: 99,
          items: [{ item_id: wine.id, item_name: 'Vinho de teste', item_category: 'Argentina', price: 99, quantity: 1 }],
        },
      });
    });
  });

  describe('GoogleTagManager', () => {
    it('stays silent and loads nothing before any consent', () => {
      const { queryByTestId } = render(<GoogleTagManager nonce="n" />);

      expect(events()).toHaveLength(0);
      expect(queryByTestId('script-google-tag-manager')).toBeNull();
    });

    it('announces consent first, then one page view per accepted category, and loads the container', () => {
      consent({ analytics: true, marketing: true });

      const { getByTestId } = render(<GoogleTagManager nonce="n" />);

      expect(events()).toEqual(['allvino_consent', 'allvino_page_view_analytics', 'allvino_page_view_marketing']);
      expect(entries()[0]).toMatchObject({ analytics_consent: true, marketing_consent: true });
      expect(entries()[1]).toMatchObject({ page_path: '/catalogo' });
      expect(getByTestId('script-google-tag-manager')).toBeTruthy();
    });

    it('does not report a page view for a category the visitor refused', () => {
      consent({ analytics: true });

      render(<GoogleTagManager nonce="n" />);

      expect(events()).toEqual(['allvino_consent', 'allvino_page_view_analytics']);
      expect(entries()[0]).toMatchObject({ analytics_consent: true, marketing_consent: false });
    });

    it('announces a later change of consent without repeating the page view of the other category', () => {
      consent({ analytics: true });
      render(<GoogleTagManager nonce="n" />);

      consent({ analytics: true, marketing: true });
      window.dispatchEvent(new CustomEvent('allvino:cookie-consent', { detail: createCookieConsent({ analytics: true, marketing: true }) }));

      return vi.waitFor(() => {
        expect(events()).toEqual([
          'allvino_consent',
          'allvino_page_view_analytics',
          'allvino_consent',
          'allvino_page_view_marketing',
        ]);
      });
    });
  });
});
