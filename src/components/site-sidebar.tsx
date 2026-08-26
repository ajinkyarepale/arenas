'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Logo } from '@/components/site-header';
import { cx } from '@/lib/format';

const PUBLIC_LINKS = [
  { href: '/markets', label: 'Markets' },
  { href: '/guide', label: 'Guide' },
  { href: '/info', label: 'About' },
];

/**
 * The persistent left rail from the refit — replaces the old top-nav links.
 * Hidden below `md`; the mobile menu in `SiteHeader` covers narrow viewports.
 */
export function SiteSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isOrganizer =
    session?.user?.role === 'ORGANIZER' || session?.user?.role === 'SUPERADMIN';

  const links = [
    ...PUBLIC_LINKS,
    ...(session ? [{ href: '/dashboard', label: 'Dashboard' }] : []),
    ...(isOrganizer ? [{ href: '/admin', label: 'Organize' }] : []),
  ];

  return (
    <aside className="hidden w-[220px] shrink-0 flex-col gap-6 glass-elevated border-r border-line py-6 md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-6">
        <Logo />
        <span className="font-display text-lg font-bold tracking-tight">Arenas</span>
      </Link>

      <nav className="flex flex-col gap-0.5 px-3">
        {links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                'rounded-lg px-3 py-2.5 font-display text-[13px] font-semibold tracking-tight transition-colors',
                active ? 'bg-ink-800 text-accent' : 'text-fg-muted hover:bg-ink-850 hover:text-fg',
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-6 font-display text-[11px] tracking-wide text-fg-faint">
        Virtual points only
      </div>
    </aside>
  );
}
