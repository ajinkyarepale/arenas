'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';

import { cx } from '@/lib/format';

const PUBLIC_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/guide', label: 'Guide' },
  { href: '/info', label: 'About' },
];

/**
 * The topbar. On `md` and up, page navigation lives in `SiteSidebar` and this
 * is just a slim bar with auth controls; below `md` (where the sidebar is
 * hidden) it also carries the hamburger menu with the full link list.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  const isOrganizer =
    session?.user?.role === 'ORGANIZER' || session?.user?.role === 'SUPERADMIN';

  const links = [
    ...PUBLIC_LINKS,
    ...(session ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(isOrganizer ? [{ href: '/admin', label: 'Organize' }] : []),
  ];

  return (
    <header className="safe-top sticky top-0 z-40 glass-elevated border-b border-line">
      <div className="safe-x mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 md:hidden" onClick={() => setOpen(false)}>
          <Logo />
          <span className="font-display text-lg font-bold tracking-tight">Arenas</span>
        </Link>

        <div className="hidden flex-1 md:block" />

        <div className="hidden items-center gap-2 md:flex">
          {status === 'loading' ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-ink-800" />
          ) : session ? (
            <>
              <span className="max-w-[10rem] truncate text-sm text-fg-muted">
                {session.user?.name}
              </span>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: '/' })}
                className="btn-ghost !min-h-0 px-3 py-2 text-sm"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/signin" className="btn-ghost !min-h-0 px-3 py-2 text-sm">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary !min-h-0 px-4 py-2 text-sm">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn-ghost !min-h-11 !min-w-11 !px-0 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            {open ? (
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <div className="safe-x glass-elevated border-t border-line px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cx(
                  'rounded-xl px-3 py-3 text-base font-medium hover:bg-ink-800 hover:text-fg',
                  pathname === link.href || pathname.startsWith(`${link.href}/`)
                    ? 'text-accent'
                    : 'text-fg-muted',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              {session ? (
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: '/' })}
                  className="btn-secondary w-full"
                >
                  Sign out
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/signin" className="btn-secondary w-full" onClick={() => setOpen(false)}>
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn-primary w-full" onClick={() => setOpen(false)}>
                    Create account
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
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="28" height="28" rx="8" fill="#10131b" stroke="rgba(61,155,255,0.28)" />
      <rect x="7.5" y="9" width="3" height="11" rx="1" fill="#00e896" />
      <path d="M9 6.5v3M9 20v2" stroke="#00e896" strokeWidth="1.3" strokeLinecap="round" />
      <rect x="17" y="12" width="3" height="8" rx="1" fill="#ff3d64" />
      <path d="M18.5 8.5v3.5M18.5 20v1.5" stroke="#ff3d64" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
