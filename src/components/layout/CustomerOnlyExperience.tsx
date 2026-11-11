"use client";

import { usePathname } from 'next/navigation';
import { GoogleTagManager } from '@/components/analytics/GoogleTagManager';
import { MetaPixel } from '@/components/analytics/MetaPixel';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { SiteFooter } from '@/components/layout/SiteFooter';

export function isAdminRoute(pathname: string | null | undefined) {
  return Boolean(pathname === '/admin' || pathname?.startsWith('/admin/'));
}

type CustomerOnlyExperienceProps = {
  nonce?: string;
};

export function CustomerOnlyExperience({ nonce }: CustomerOnlyExperienceProps) {
  const pathname = usePathname();

  if (isAdminRoute(pathname)) return null;

  return (
    <>
      <GoogleTagManager nonce={nonce} />
      <MetaPixel nonce={nonce} />
      <SiteFooter />
      <WhatsAppButton />
      <CookieConsentBanner />
    </>
  );
}
