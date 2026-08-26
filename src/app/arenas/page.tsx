import type { Metadata } from 'next';

import { ArenaDirectory } from '@/components/arena-directory';
import { SiteShell } from '@/components/site-shell';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = { title: 'Arenas' };
export const dynamic = 'force-dynamic';

export default function ArenasPage() {
  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Browse"
          title="Arenas"
          subtitle="Search every arena on the platform. Ones you have already joined show an Enter button; the rest need the code from your organizer."
        />
        <ArenaDirectory showJoinActions />
      </div>
    </SiteShell>
  );
}
