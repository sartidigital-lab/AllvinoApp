'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsent,
} from '@/lib/privacy/cookieConsent';

const GOOGLE_TAG_MANAGER_ID = 'GTM-KFPG6J42';
const GOOGLE_ANALYTICS_ID = 'G-F5T9JS9VYQ';
const GOOGLE_ADS_ID = 'AW-18556930168';
const COOKIE_CONSENT_CHANGED_EVENT = 'allvino:cookie-consent';

function hasAnalyticsConsent(consent: CookieConsent | null) {
  return isCookieCategoryAllowed(consent, 'analytics');
}

type GoogleTagManagerProps = {
  nonce?: string;
};

declare global {
  interface Window {
    __allvinoGoogleTagConfigured?: boolean;
  }
}

function configureGoogleTag() {
  if (window.__allvinoGoogleTagConfigured) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || ((...args: unknown[]) => {
    window.dataLayer?.push(args);
  });
  window.gtag('js', new Date());
  window.gtag('config', GOOGLE_ANALYTICS_ID, { send_page_view: false });
  window.gtag('config', GOOGLE_ADS_ID);
  window.__allvinoGoogleTagConfigured = true;
}

export function GoogleTagManager({ nonce }: GoogleTagManagerProps) {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const lastTrackedPathname = useRef<string | null>(null);

  useEffect(() => {
    const refreshConsent = (event?: Event) => {
      const consent = event instanceof CustomEvent
        ? event.detail as CookieConsent
        : readCookieConsent(document.cookie);
      setEnabled(hasAnalyticsConsent(consent));
    };

    refreshConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
  }, []);

  useEffect(() => {
    if (!enabled || !pathname || lastTrackedPathname.current === pathname) return;

    configureGoogleTag();
    window.gtag?.('event', 'page_view', {
      page_location: window.location.href,
      page_path: pathname,
    });
    lastTrackedPathname.current = pathname;
  }, [enabled, pathname]);

  if (!enabled) return null;

  return (
    <>
      <Script
        id="google-tag-library"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="google-tag-config" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
          if (!window.__allvinoGoogleTagConfigured) {
            window.gtag('js', new Date());
            window.gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });
            window.gtag('config', '${GOOGLE_ADS_ID}');
            window.__allvinoGoogleTagConfigured = true;
          }
        `}
      </Script>
      <Script id="google-tag-manager" strategy="afterInteractive" nonce={nonce}>
      {`
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        (function(w,d,s,l,i){
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
      `}
      </Script>
    </>
  );
}
