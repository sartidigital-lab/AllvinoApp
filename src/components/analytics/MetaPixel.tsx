'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsent,
} from '@/lib/privacy/cookieConsent';

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

export function MetaPixel() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const lastTrackedPathname = useRef<string | null>(null);

  const trackPageView = () => {
    if (!pathname || lastTrackedPathname.current === pathname || !window.fbq) return;

    window.fbq('track', 'PageView');
    lastTrackedPathname.current = pathname;
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
    if (enabled) trackPageView();
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive" onReady={trackPageView}>
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
