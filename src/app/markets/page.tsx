import type { Metadata } from 'next';
import Link from 'next/link';

import { ArenaDirectory } from '@/components/arena-directory';
import { SiteShell } from '@/components/site-shell';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Explore Arenas',
  description:
    'Discover live and upcoming prediction market tournaments across host colleges. Browse freely — you only need a join code to enter.',
};
export const dynamic = 'force-dynamic';

export default function MarketsPage() {
  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Discover"
          title="Explore Arenas"
          subtitle="Live now, opening soon, and recently settled — every public tournament across host colleges. Arenas you've joined offer a direct way back in."
          actions={
            <Link href="/signup" className="btn-primary text-sm">
              Create an Arena
            </Link>
          }
        />
        <ArenaDirectory showJoinActions />
      </div>
    </SiteShell>
  );
}
