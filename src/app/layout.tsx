import type { Metadata, Viewport } from 'next';
import { Barlow, Chakra_Petch, JetBrains_Mono } from 'next/font/google';

import { Providers } from '@/components/providers';
import './globals.css';

const barlow = Barlow({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

// Technical display face per the Glass System spec: headings, percentages
// and technical metadata, often set uppercase to reinforce the machined feel.
const chakra = Chakra_Petch({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['500', '600', '700'],
  display: 'swap',
});

// Retained for the handful of spots that still want a monospace numeral
// (join codes, timestamps); the refit's own labels now use the display face.
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
    'Arenas runs live Yes/No prediction market tournaments for college FinTech events. Trade virtual points on whether the next candle closes green, priced by an automated market maker.',
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
      'Run a 5-Min Candle tournament for your college. Virtual points, live LMSR pricing, big-screen leaderboard.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#04060d',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  // Content must reach into the notch area so we can pad it deliberately.
  viewportFit: 'cover',
  // Zoom stays enabled — disabling it is an accessibility failure, and the
  // 16px input font size already prevents iOS auto-zoom on focus.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${chakra.variable} ${mono.variable} dark`}
    >
      <body className="min-h-[100dvh]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
