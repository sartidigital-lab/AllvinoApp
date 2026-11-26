'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isCookieCategoryAllowed,
  readCookieConsent,
  type CookieConsent,
} from '@/lib/privacy/cookieConsent';
import { pushDataLayer, type TrackingConsent } from '@/lib/analytics/dataLayer';

const GOOGLE_TAG_MANAGER_ID = 'GTM-KFPG6J42';
const COOKIE_CONSENT_CHANGED_EVENT = 'allvino:cookie-consent';

function toConsent(consent: CookieConsent | null): TrackingConsent {
  return {
    analytics: isCookieCategoryAllowed(consent, 'analytics'),
    marketing: isCookieCategoryAllowed(consent, 'marketing'),
  };
}

type GoogleTagManagerProps = {
  nonce?: string;
};

/**
 * Loads Google Tag Manager once the visitor accepted analytics or marketing
 * cookies, and tells it what was accepted and which page is showing. The
 * Meta Pixel, GA4 and Google Ads tags are configured in the container
 * (GTM-KFPG6J42) and each one waits for its own consent flag.
 */
export function GoogleTagManager({ nonce }: GoogleTagManagerProps) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<TrackingConsent>({ analytics: false, marketing: false });
  const announced = useRef<string | null>(null);
  const lastAnalyticsPath = useRef<string | null>(null);
  const lastMarketingPath = useRef<string | null>(null);

  useEffect(() => {
    const refreshConsent = (event?: Event) => {
      const next = event instanceof CustomEvent
        ? event.detail as CookieConsent
        : readCookieConsent(document.cookie);
      setConsent(toConsent(next));
    };

    refreshConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, refreshConsent);
  }, []);

  // Runs before the page-view effect below, so the container knows the consent first.
  useEffect(() => {
    const key = `${consent.analytics}|${consent.marketing}`;
    if (announced.current === key) return;
    // Nothing was ever accepted: stay silent instead of announcing a refusal on every visit.
    if (announced.current === null && !consent.analytics && !consent.marketing) return;

    announced.current = key;
    pushDataLayer({
      event: 'allvino_consent',
      analytics_consent: consent.analytics,
      marketing_consent: consent.marketing,
    });
  }, [consent]);

  useEffect(() => {
    if (!pathname) return;
    const page = { page_location: window.location.href, page_path: pathname, page_title: document.title };

    if (consent.analytics && lastAnalyticsPath.current !== pathname) {
      lastAnalyticsPath.current = pathname;
      pushDataLayer({ event: 'allvino_page_view_analytics', ...page });
    }
    if (consent.marketing && lastMarketingPath.current !== pathname) {
      lastMarketingPath.current = pathname;
      pushDataLayer({ event: 'allvino_page_view_marketing', ...page });
    }
  }, [consent, pathname]);

  if (!consent.analytics && !consent.marketing) return null;

  return (
    <Script id="google-tag-manager" strategy="afterInteractive" nonce={nonce}>
      {`
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        (function(w,d,s,l,i){
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.nonce='${nonce ?? ''}';
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
      `}
    </Script>
  );
}
