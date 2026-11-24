import type { Metadata, Viewport } from 'next';
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/big-shoulders-display/700';
import '@fontsource/big-shoulders-display/800';
import './globals.css';
import './motion.css';
import './admin.css';
import './hero.css';
import { CartProvider } from '@/components/cart';

export const metadata: Metadata = {
  title: "Miss Viet's Lunch Bar | Bánh mì and bún bowls in Eastwood, Adelaide",
  description:
    'Order crackling pork bánh mì, bún bowls, rice bowls and phở for pickup from Miss Viet’s Lunch Bar, 91 Glen Osmond Rd, Eastwood SA.',
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = { themeColor: '#14382d', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
