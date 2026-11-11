'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsent,
} from '@/lib/privacy/cookieConsent';
import type { MetaConversionEvent } from '@/lib/analytics/conversionEvents';

const META_PIXEL_ID = '1566575165487222';
const COOKIE_CONSENT_CHANGED_EVENT = 'allvino:cookie-consent';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function hasMarketingConsent(consent: CookieConsent | null) {
  return isCookieCategoryAllowed(consent, 'marketing');
}

type MetaPixelProps = {
  nonce?: string;
};

function valueParameters(properties: MetaConversionEvent['properties']) {
  const value = typeof properties.total === 'number'
    ? properties.total
    : typeof properties.cart_total === 'number'
      ? properties.cart_total
      : undefined;
  const itemCount = typeof properties.item_count === 'number' ? properties.item_count : undefined;
  const productId = typeof properties.product_id === 'string' ? properties.product_id : undefined;

  return {
    ...(value === undefined ? {} : { value, currency: 'BRL' }),
    ...(itemCount === undefined ? {} : { num_items: itemCount }),
    ...(productId ? { content_ids: [productId], content_type: 'product' } : {}),
  };
}

function sendConversionEvent(event: MetaConversionEvent) {
  if (!window.fbq) return false;

  const parameters = valueParameters(event.properties);
  if (event.name === 'product_view') {
    window.fbq('track', 'ViewContent', parameters);
  } else if (event.name === 'add_to_cart') {
    window.fbq('track', 'AddToCart', parameters);
  } else if (event.name === 'checkout_started') {
    window.fbq('track', 'InitiateCheckout', parameters);
  } else {
    const customName = event.name.replace(/(^|_)([a-z])/g, (_, prefix: string, letter: string) => `${prefix ? '' : ''}${letter.toUpperCase()}`);
    window.fbq('trackCustom', customName, parameters);
  }

  return true;
}

export function MetaPixel({ nonce }: MetaPixelProps) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const lastTrackedPathname = useRef<string | null>(null);

  const trackPageView = () => {
    if (!pathname || lastTrackedPathname.current === pathname || !window.fbq) return;

    window.fbq('track', 'PageView');
    lastTrackedPathname.current = pathname;
  };

  const flushPendingConversions = () => {
    const pending = [...(window.allvinoMetaEventQueue || [])];
    for (const event of pending) {
      if (!sendConversionEvent(event)) return;
      window.allvinoMetaEventQueue = (window.allvinoMetaEventQueue || []).filter((queued) => queued.id !== event.id);
    }
  };

  useEffect(() => {
    const refreshConsent = (event?: Event) => {
      const consent = event instanceof CustomEvent
        ? event.detail as CookieConsent
        : readCookieConsent(document.cookie);
      setEnabled(hasMarketingConsent(consent));
    };

    refreshConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleConversion = (browserEvent: Event) => {
      const conversion = browserEvent instanceof CustomEvent
        ? browserEvent.detail as MetaConversionEvent
        : null;
      if (!conversion || !sendConversionEvent(conversion)) return;
      window.allvinoMetaEventQueue = (window.allvinoMetaEventQueue || []).filter((queued) => queued.id !== conversion.id);
    };

    window.addEventListener('allvino:conversion', handleConversion);
    flushPendingConversions();
    return () => window.removeEventListener('allvino:conversion', handleConversion);
  }, [enabled]);

  useEffect(() => {
    if (enabled) trackPageView();
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce} onReady={() => {
      trackPageView();
      flushPendingConversions();
    }}>
      {`
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${META_PIXEL_ID}');
      `}
    </Script>
  );
}
