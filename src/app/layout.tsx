import { AppChrome } from '../components/layout/AppChrome';
import { CartProvider } from '../context/CartContext';
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
          <AppChrome />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
