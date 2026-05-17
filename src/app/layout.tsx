import { Suspense } from 'react';
import { AuthModal } from '../components/auth/AuthModal';
import { Navbar } from '../components/layout/Navbar';
import { Header } from '../components/layout/Header';
import { CartProvider } from '../context/CartContext';
import { CartOverlay } from '../components/cart/CartOverlay';
import './globals.css';

export const metadata = {
  title: 'Allvino App',
  description: 'Aplicativo de degustação e catálogo de vinhos Allvino',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif:ital,wght@0,300;0,700&family=Manrope:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="pb-24">
        <CartProvider>
          <Header />
          {children}
          <Navbar />
          <CartOverlay />
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </CartProvider>
      </body>
    </html>
  );
}
