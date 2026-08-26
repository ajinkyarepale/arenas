import Link from 'next/link';

import { SiteShell } from '@/components/site-shell';

export default function NotFound() {
  return (
    <SiteShell width="narrow">
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="tnum text-6xl font-bold tracking-tight text-fg-faint">404</div>
        <h1 className="text-2xl font-bold tracking-tight">Nothing here</h1>
        <p className="max-w-sm text-sm text-fg-muted">
          That arena code does not exist, or the page has moved. Double-check the code your
          organizer gave you.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Link href="/markets" className="btn-primary sm:w-44">
            Browse markets
          </Link>
          <Link href="/" className="btn-secondary sm:w-44">
            Home
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}
