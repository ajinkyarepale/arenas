import Link from 'next/link';

import { ArcsMark } from '@/components/arcs-mark';

export function SiteFooter() {
  return (
    <footer className="safe-bottom safe-x mt-20 border-t border-line bg-ink-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.2fr_2fr]">
          <div>
            <div className="text-[15px] font-extrabold tracking-tight text-fg">Arenas</div>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-fg-muted">
              Live prediction markets for campus FinTech events. Opinions become
              markets — settled in Arcs, virtual credits with no cash value.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3" aria-label="Footer">
            <div className="flex flex-col gap-2.5">
              <span className="label">Trade</span>
              <Link href="/markets" className="text-fg-muted transition-colors hover:text-fg">Explore Arenas</Link>
              <Link href="/dashboard" className="text-fg-muted transition-colors hover:text-fg">Portfolio</Link>
              <Link href="/guide" className="text-fg-muted transition-colors hover:text-fg">Trading guide</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="label">Organize</span>
              <Link href="/signup" className="text-fg-muted transition-colors hover:text-fg">Create an account</Link>
              <Link href="/admin" className="text-fg-muted transition-colors hover:text-fg">Organizer tools</Link>
              <Link href="/info" className="text-fg-muted transition-colors hover:text-fg">How it works</Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="label">Account</span>
              <Link href="/signin" className="text-fg-muted transition-colors hover:text-fg">Sign in</Link>
              <Link href="/dashboard" className="text-fg-muted transition-colors hover:text-fg">Arcs wallet</Link>
            </div>
          </nav>
        </div>

        <div className="mt-10 border-t border-line pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-fg-faint">
            <span className="inline-flex items-center gap-1 font-semibold text-fg-muted">
              Arcs (ARC <ArcsMark className="text-fg-muted" />)
            </span>{' '}
            are virtual, non-cash credits for participating in Arenas.
            They have no cash value, no exchange rate, and cannot be withdrawn,
            transferred, or redeemed. Nothing here is a financial instrument or
            investment advice. Price data from the Binance public API. ©{' '}
            {new Date().getFullYear()} Arenas.
          </p>
        </div>
      </div>
    </footer>
  );
}
