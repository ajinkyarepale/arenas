import type { Metadata } from 'next';

import { ArenaDirectory } from '@/components/arena-directory';
import { SiteShell } from '@/components/site-shell';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Upcoming markets',
  description:
    'Every scheduled Arenas event across all host colleges and organizers. Browse freely — you only need a join code to enter.',
};
export const dynamic = 'force-dynamic';

export default function MarketsPage() {
  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Public calendar"
          title="Upcoming markets"
          subtitle="Every arena scheduled across all host colleges. Anyone can browse this list; the join code your organizer gives you is what gets you into the room."
        />
        <ArenaDirectory />
      </div>
    </SiteShell>
  );
}
