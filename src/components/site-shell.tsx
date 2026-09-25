import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { cx } from '@/lib/format';

/**
 * Standard page chrome — single top bar, no sidebar. Full-bleed routes
 * (trading screen, projector) don't use this shell.
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
    <div className="flex min-h-[100dvh] flex-col bg-ink-950">
      <SiteHeader />
      <main
        className={cx(
          'safe-x mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12',
          width === 'narrow' && 'max-w-xl',
          width === 'default' && 'max-w-5xl',
          width === 'wide' && 'max-w-7xl',
          className,
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
