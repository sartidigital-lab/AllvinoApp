import { AppChrome } from '../components/layout/AppChrome';
import { FirstVisitExperience } from '../components/onboarding/FirstVisitExperience';
import { PushSubscriptionManager } from '../components/push/PushSubscriptionManager';
import { CustomerOnlyExperience } from '../components/layout/CustomerOnlyExperience';
import { CartProvider } from '../context/CartContext';
import { ToastProvider } from '../context/ToastContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { RecentlyViewedProvider } from '../context/RecentlyViewedContext';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import './globals.css';

export const metadata = {
  title: 'Allvino App',
  description: 'Aplicativo de degustação e catálogo de vinhos Allvino',
  manifest: '/manifest-v4.json',
  icons: {
    icon: [
      { url: '/icon-192.png?v=4', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png?v=4', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png?v=4', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The Proxy creates one CSP nonce per request. Rendering dynamically is
  // required so Next can attach that nonce to its framework and page scripts.
  await connection();
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,700&family=Manrope:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="pb-24">
        <ToastProvider>
          <RecentlyViewedProvider>
            <FavoritesProvider>
              <CartProvider>
                <AppChrome />
                {children}
                <CustomerOnlyExperience nonce={nonce} />
                <FirstVisitExperience />
                <PushSubscriptionManager />
              </CartProvider>
            </FavoritesProvider>
          </RecentlyViewedProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
