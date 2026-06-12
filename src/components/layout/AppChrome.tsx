"use client";

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { AuthModal } from '@/components/auth/AuthModal';
import { CartOverlay } from '@/components/cart/CartOverlay';
import { Header } from '@/components/layout/Header';
import { Navbar } from '@/components/layout/Navbar';

export function AppChrome() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  if (isAdminRoute) {
    return (
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
    );
  }

  return (
    <>
      <Header />
      <Navbar />
      <CartOverlay />
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>
    </>
  );
}
