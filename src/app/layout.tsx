import { Suspense } from 'react';
import { AuthModal } from '../components/auth/AuthModal';
import { Navbar } from '../components/layout/Navbar';
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
      <body className="pb-24">
        {children}
        <Navbar />
        <Suspense fallback={null}>
          <AuthModal />
        </Suspense>
      </body>
    </html>
  );
}
