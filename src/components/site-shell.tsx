import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SiteSidebar } from '@/components/site-sidebar';
import { cx } from '@/lib/format';

/**
 * Standard page chrome. Applied explicitly per page rather than through a route
 * group layout, because the two full-bleed routes — the trading screen and the
 * projector display — sit under the same /arenas/[code] path and must not
 * inherit the sidebar/header.
 */
export function SiteShell({
  children,
  className,
  width = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  width?: 'default' | 'wide' | 'narrow';
}) {
  return (
    <div className="flex min-h-[100dvh]">
      <SiteSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        <main
          className={cx(
            'safe-x mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12',
            width === 'narrow' && 'max-w-xl',
            width === 'default' && 'max-w-5xl',
            width === 'wide' && 'max-w-6xl',
            className,
          )}
        >
          {children}
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
