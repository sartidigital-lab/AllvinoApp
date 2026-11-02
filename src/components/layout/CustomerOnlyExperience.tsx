"use client";

import { usePathname } from 'next/navigation';
import { CookieConsentBanner } from '@/components/privacy/CookieConsentBanner';
import { WhatsAppButton } from '@/components/layout/WhatsAppButton';
import { SiteFooter } from '@/components/layout/SiteFooter';

export function isAdminRoute(pathname: string | null | undefined) {
  return Boolean(pathname === '/admin' || pathname?.startsWith('/admin/'));
}

export function CustomerOnlyExperience() {
  const pathname = usePathname();

  if (isAdminRoute(pathname)) return null;

  return (
    <>
      <SiteFooter />
      <WhatsAppButton />
      <CookieConsentBanner />
    </>
  );
}
