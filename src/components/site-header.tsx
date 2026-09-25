'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { ArcsMark } from '@/components/arcs-mark';
import { cx } from '@/lib/format';

/**
 * Terminal top bar: wordmark + primary nav left, join-code field center,
 * wallet-aware auth cluster right. One bar on every viewport.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const isOrganizer =
    session?.user?.role === 'ORGANIZER' || session?.user?.role === 'SUPERADMIN';

  const links = [
    { href: '/markets', label: 'Markets' },
    { href: '/guide', label: 'Guide' },
    { href: '/info', label: 'About' },
    ...(session ? [{ href: '/dashboard', label: 'Portfolio' }] : []),
    ...(isOrganizer ? [{ href: '/admin', label: 'Organize' }] : []),
  ];

  const submitJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code) window.location.href = `/arenas/${encodeURIComponent(code)}`;
  };

  return (
    <header className="safe-top glass-elevated sticky top-0 z-40">
      <div className="safe-x mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={() => setOpen(false)} aria-label="Arenas home">
          <Logo />
          <span className="text-[17px] font-extrabold tracking-tight text-fg">Arenas</span>
        </Link>

        <nav className="ml-3 hidden items-center gap-0.5 lg:flex" aria-label="Primary">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                  active ? 'bg-ink-800 text-fg' : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={submitJoin} className="ml-auto hidden min-w-0 max-w-[220px] flex-1 items-center md:flex" role="search">
          <label className="relative w-full">
            <span className="sr-only">Join an arena with its code</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M7.25 12.5a5.25 5.25 0 1 0 0-10.5 5.25 5.25 0 0 0 0 10.5ZM11.5 11.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Join code"
              className="h-9 w-full rounded-lg border border-line bg-ink-950 pl-9 pr-3 font-mono text-[13px] uppercase tracking-wider text-fg placeholder:text-fg-faint focus:border-accent focus:outline-none"
              maxLength={12}
            />
          </label>
        </form>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0">
          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-lg bg-ink-800" aria-hidden />
          ) : session ? (
            <>
              <Link
                href="/dashboard"
                className="hidden items-center gap-1.5 rounded-lg border border-line bg-ink-850 px-3 py-2 text-[13px] font-bold text-fg transition-colors hover:border-line-strong sm:inline-flex"
                title="Your Arcs wallet and portfolio"
              >
                <ArcsMark className="text-accent" />
                <span className="max-w-[7rem] truncate font-semibold text-fg-muted">{session.user?.name?.split(' ')[0]}</span>
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/' })}
                className="hidden rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition-colors hover:text-fg sm:block"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:text-fg sm:block">
                Log in
              </Link>
              <Link href="/signup" className="btn-primary !min-h-0 px-4 py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-ink-850 lg:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open ? (
        <div className="safe-x border-t border-line bg-ink-900 px-4 py-3 lg:hidden">
          <form onSubmit={submitJoin} className="mb-2 md:hidden" role="search">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Join code — e.g. DEMO24"
              className="h-11 w-full rounded-lg border border-line bg-ink-950 px-3 font-mono text-sm uppercase tracking-wider placeholder:text-fg-faint focus:border-accent focus:outline-none"
              maxLength={12}
            />
          </form>
          <nav className="flex flex-col gap-0.5" aria-label="Mobile">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cx(
                  'rounded-lg px-3 py-2.5 text-[15px] font-semibold',
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? 'bg-ink-800 text-accent'
                    : 'text-fg-muted hover:bg-ink-850',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              {session ? (
                <button type="button" onClick={() => void signOut({ callbackUrl: '/' })} className="btn-secondary w-full">
                  Sign out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/signin" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                    Log in
                  </Link>
                  <Link href="/signup" className="btn-primary w-full" onClick={() => setOpen(false)}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 28 28" fill="none" className={className} aria-hidden>
      <rect width="28" height="28" rx="7" fill="#14202f" stroke="rgba(91,140,255,0.4)" />
      <path d="M7 19.5v-7M12 19.5V8.5M17 19.5v-5M22 19.5V11" stroke="#e9ebf1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="8" r="2" fill="#5b8cff" />
    </svg>
  );
}
