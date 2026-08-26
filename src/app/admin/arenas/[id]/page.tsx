import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArenaControl } from '@/components/admin/arena-control';
import { RoundTimeline, SplitBar } from '@/components/charts';
import { SiteShell } from '@/components/site-shell';
import { PageHeader, Panel, Stat } from '@/components/ui';
import { getArenaAnalytics } from '@/lib/analytics';
import { auth, isOrganizer } from '@/lib/auth';
import { formatPoints, formatProbability } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const arena = await prisma.event.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: arena ? `Manage ${arena.name}` : 'Manage arena' };
}

export default async function ManageArenaPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/admin/arenas/${params.id}`)}`);
  }
  if (!isOrganizer(session.user.role)) redirect('/dashboard?error=organizer-only');

  const arena = await prisma.event.findUnique({
    where: { id: params.id },
    select: { id: true, code: true, name: true, organizerId: true },
  });

  // Ownership check. A 404 rather than a 403, so probing IDs cannot confirm
  // that another organizer's arena exists.
  if (!arena) notFound();
  if (session.user.role !== 'SUPERADMIN' && arena.organizerId !== session.user.id) {
    notFound();
  }

  const market = await getArenaAnalytics(arena.id);

  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-6">
        <Link href="/admin" className="text-sm text-fg-muted hover:text-fg">
          &larr; Your arenas
        </Link>
        <PageHeader eyebrow="Control panel" title={arena.name} />
        <ArenaControl arenaId={arena.id} code={arena.code} />

        {market.resolvedRounds > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
              Session analytics
            </h2>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                label="Rounds settled"
                value={market.resolvedRounds}
                hint={market.voidCount > 0 ? `${market.voidCount} void` : undefined}
              />
              <Stat
                label="Volume"
                value={formatPoints(market.totalVolume, 0)}
                hint={`${market.totalTrades} trades`}
              />
              <Stat
                label="Crowd accuracy"
                value={
                  market.crowdAccuracy !== null
                    ? formatProbability(market.crowdAccuracy, 0)
                    : '—'
                }
                hint="favourite won this often"
                tone={
                  market.crowdAccuracy !== null && market.crowdAccuracy > 0.5 ? 'yes' : undefined
                }
              />
              <Stat
                label="Busiest round"
                value={market.busiestRound ? `R${market.busiestRound.roundNumber}` : '—'}
                hint={
                  market.busiestRound
                    ? `${formatPoints(market.busiestRound.volume, 0)} pts`
                    : undefined
                }
              />
            </div>

            <Panel className="flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="label">Round by round</span>
                <span className="text-xs text-fg-faint">
                  fill height = market&apos;s YES probability · ✓ = crowd called it
                </span>
              </div>

              <RoundTimeline rounds={market.rounds} />

              {market.yesCount + market.noCount > 0 ? (
                <div className="border-t border-line pt-4">
                  <div className="label mb-2">Outcome split</div>
                  <SplitBar
                    left={market.yesCount}
                    right={market.noCount}
                    leftLabel={`${market.yesCount} closed UP`}
                    rightLabel={`${market.noCount} closed DOWN`}
                  />
                </div>
              ) : null}
            </Panel>
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}
