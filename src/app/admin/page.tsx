import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Arcs } from '@/components/arcs-mark';
import { SiteShell } from '@/components/site-shell';
import { EmptyState, PageHeader, Panel, Stat, StatusPill } from '@/components/ui';
import { auth, isOrganizer } from '@/lib/auth';
import { formatDateTime, formatDuration, formatPoints } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = { title: 'Organizer' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/admin');
  // Middleware already gates this path; re-checking here means the page is
  // still safe if that matcher is ever changed.
  if (!isOrganizer(session.user.role)) redirect('/dashboard?error=organizer-only');

  const where =
    session.user.role === 'SUPERADMIN' ? {} : { organizerId: session.user.id };

  const arenas = await prisma.event.findMany({
    where,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    include: {
      organizer: { select: { name: true } },
      _count: { select: { participants: true, trades: true } },
    },
  });

  const live = arenas.filter((a) => a.status === 'LIVE').length;
  const totalParticipants = arenas.reduce((sum, a) => sum + a._count.participants, 0);
  const totalTrades = arenas.reduce((sum, a) => sum + a._count.trades, 0);

  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Organizer"
          title="Your arenas"
          subtitle="Create an arena, hand out its join code, and run the session from here."
          actions={
            <Link href="/admin/arenas/new" className="btn-primary text-sm">
              New arena
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Arenas" value={arenas.length} />
          <Stat label="Live now" value={live} tone={live > 0 ? 'yes' : undefined} />
          <Stat label="Participants" value={totalParticipants} />
          <Stat label="Trades" value={totalTrades} />
        </div>

        {arenas.length === 0 ? (
          <EmptyState
            title="No arenas yet"
            body="Create your first arena, share the join code with the room, and open the big screen on the projector."
            action={{ href: '/admin/arenas/new', label: 'Create an arena' }}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {arenas.map((arena) => (
              <li key={arena.id}>
                <Panel className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill status={arena.status} />
                        <code className="rounded-md border border-line bg-ink-900 px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-accent">
                          {arena.code}
                        </code>
                        {session.user.role === 'SUPERADMIN' ? (
                          <span className="text-xs text-fg-faint">
                            by {arena.organizer.name}
                          </span>
                        ) : null}
                      </div>

                      <h3 className="mt-2 text-lg font-bold tracking-tight">{arena.name}</h3>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-faint">
                        <span>{arena.asset}</span>
                        <span aria-hidden>·</span>
                        <span>
                          {arena.totalRounds} × {formatDuration(arena.roundDurationSec)}
                        </span>
                        <span aria-hidden>·</span>
                        <span>b = {arena.liquidityParamB}</span>
                        <span aria-hidden>·</span>
                        <span><Arcs value={arena.startingBalance} decimals={0} /> start</span>
                        <span aria-hidden>·</span>
                        <span>{arena._count.participants} joined</span>
                        <span aria-hidden>·</span>
                        <span>{arena._count.trades} trades</span>
                      </div>

                      <p className="mt-2 text-sm text-fg-muted">
                        {arena.status === 'LIVE'
                          ? `Round ${arena.currentRound} of ${arena.totalRounds} in play`
                          : arena.status === 'ENDED'
                            ? `Ended ${formatDateTime(arena.endsAt?.toISOString() ?? null)}`
                            : `Scheduled ${formatDateTime(arena.scheduledFor?.toISOString() ?? null)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      <Link
                        href={`/admin/arenas/${arena.id}`}
                        className="btn-primary w-full text-sm"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/arenas/${arena.code}/screen`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary w-full text-sm"
                      >
                        Big screen ↗
                      </Link>
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SiteShell>
  );
}
