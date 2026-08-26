'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      // Don't poll the session endpoint on an interval — during a live round
      // every background request competes with the trading screen. The session
      // is refreshed on window focus instead, which is when it can actually
      // have changed.
      refetchInterval={0}
      refetchOnWindowFocus
    >
      {children}
    </SessionProvider>
  );
}
