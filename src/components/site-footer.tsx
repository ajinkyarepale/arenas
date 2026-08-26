import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="safe-bottom safe-x relative mt-20 border-t border-line bg-ink-900/60">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="font-display text-lg font-bold uppercase tracking-[0.12em]">
              Arenas
            </div>
            <p className="mt-2 text-sm text-fg-muted">
              Live prediction market tournaments for college FinTech events.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-12 gap-y-2 font-mono text-xs uppercase tracking-[0.1em] sm:grid-cols-3">
            <Link href="/markets" className="text-fg-muted transition-colors hover:text-accent">
              Upcoming markets
            </Link>
            <Link href="/guide" className="text-fg-muted transition-colors hover:text-accent">
              Trading guide
            </Link>
            <Link href="/info" className="text-fg-muted transition-colors hover:text-accent">
              About
            </Link>
            <Link href="/signup" className="text-fg-muted transition-colors hover:text-accent">
              Create account
            </Link>
            <Link href="/signin" className="text-fg-muted transition-colors hover:text-accent">
              Sign in
            </Link>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="text-xs leading-relaxed text-fg-faint">
            Arenas is an educational platform. Every market settles in virtual points with
            no cash value. There is no deposit, no withdrawal, no payment processing, and
            no real-money wagering anywhere in the system — nothing here is a financial
            instrument, and nothing here is investment advice.
          </p>
          <p className="mt-4 text-xs text-fg-faint">
            Price data from the Binance public API. © {new Date().getFullYear()} Arenas.
          </p>
        </div>
      </div>
    </footer>
  );
}
