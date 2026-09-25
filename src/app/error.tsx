'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something broke</h1>
      <p className="max-w-sm text-sm text-fg-muted">
        An unexpected error stopped this page from rendering. If a round is in play, your
        balance and positions are safe on the server.
      </p>
      <button type="button" onClick={reset} className="btn-primary mt-2 w-44">
        Try again
      </button>
    </div>
  );
}
