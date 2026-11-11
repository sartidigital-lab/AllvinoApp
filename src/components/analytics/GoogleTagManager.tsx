'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';
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

export function GoogleTagManager({ nonce }: GoogleTagManagerProps) {
  const [enabled, setEnabled] = useState(false);

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

  if (!enabled) return null;

  return (
    <Script id="google-tag-manager" strategy="afterInteractive" nonce={nonce}>
      {`
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
        function gtag(){window.dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${GOOGLE_ANALYTICS_ID}');
        gtag('config', '${GOOGLE_ADS_ID}');
        (function(w,d,s,l,i){
          var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
          j.async=true;
          j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
          f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GOOGLE_TAG_MANAGER_ID}');
      `}
    </Script>
  );
}
