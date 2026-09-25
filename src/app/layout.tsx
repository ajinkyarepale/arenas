import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';

import { Providers } from '@/components/providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Arenas — live prediction markets for campus FinTech events',
    template: '%s · Arenas',
  },
  description:
    'Arenas runs live Yes/No prediction market tournaments for college FinTech events. Trade Arcs — virtual credits — on whether the next candle closes green, priced by an automated market maker.',
  applicationName: 'Arenas',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Arenas',
    // Black-translucent lets the page paint behind the iOS status bar; the
    // safe-area padding in globals.css keeps content clear of the notch.
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
    openGraph: {
    title: 'Arenas — live prediction markets for campus FinTech events',
    description:
      'Run a 5-Min Candle tournament for your college. Arcs virtual credits, live LMSR pricing, big-screen leaderboard.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#05070c',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `dark` on <html> from the first paint: no light-mode flash, ever.
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`} style={{ colorScheme: 'dark' }}>
      <body className="min-h-[100dvh] bg-ink-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
