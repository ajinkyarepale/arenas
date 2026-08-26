import type { Metadata, Viewport } from 'next';

import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Arenas — live prediction markets for campus FinTech events',
    template: '%s · Arenas',
  },
  description:
    'Arenas runs live Yes/No prediction market tournaments for college FinTech events.',
  applicationName: 'Arenas',
};

export const viewport: Viewport = {
  themeColor: '#131313',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Epilogue:wght@400;500;600;700;800&family=Geist:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#131313] text-[#e5e2e1] min-h-screen font-sans antialiased selection:bg-zinc-800 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
