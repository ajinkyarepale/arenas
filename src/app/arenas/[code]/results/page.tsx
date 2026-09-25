import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Arcs } from '@/components/arcs-mark';
import { Leaderboard } from '@/components/arena/leaderboard';
import { RoundTimeline, SplitBar } from '@/components/charts';
import { SiteShell } from '@/components/site-shell';
import { Badge, EmptyState, Panel, StatusPill, Stat } from '@/components/ui';
import { getArenaAnalytics } from '@/lib/analytics';
import { auth } from '@/lib/auth';
import { computeLeaderboard } from '@/lib/engine/round-engine';
import {
  cx,
  formatPoints,
  formatPrice,
  formatProbability,
  formatSignedPoints,
  ordinal,
} from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return { title: 'Results' };
  const arena = await prisma.event.findUnique({
    where: { code: parsed.data },
    select: { name: true },
  });
  return { title: arena ? `${arena.name} — results` : 'Results' };
}

export default async function ResultsPage({ params }: { params: { code: string } }) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) notFound();

  const arena = await prisma.event.findUnique({
    where: { code: parsed.data },
    include: { organizer: { select: { name: true } } },
  });
  if (!arena) notFound();

  const session = await auth();

  const [leaderboard, rounds, market] = await Promise.all([
    computeLeaderboard(arena.id),
    prisma.round.findMany({
      where: { eventId: arena.id, status: 'RESOLVED' },
      orderBy: { roundNumber: 'asc' },
    }),
    getArenaAnalytics(arena.id),
  ]);

  const participant = session?.user?.id
    ? await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId: arena.id, userId: session.user.id } },
        select: { id: true, balance: true },
      })
    : null;

  const myTrades = participant
    ? await prisma.trade.findMany({
        where: { participantId: participant.id },
        orderBy: { createdAt: 'asc' },
        include: { round: { select: { roundNumber: true, outcome: true } } },
      })
    : [];

  // Collapse a participant's trades into one row per round.
  const byRound = new Map<
    number,
    { outcome: string | null; staked: number; payout: number; sides: Set<string> }
  >();
  for (const trade of myTrades) {
    const key = trade.round.roundNumber;
    const entry = byRound.get(key) ?? {
      outcome: trade.round.outcome,
      staked: 0,
      payout: 0,
      sides: new Set<string>(),
    };
    entry.staked += trade.cost;
    entry.payout += trade.payout ?? 0;
    entry.sides.add(trade.side);
    byRound.set(key, entry);
  }
  const myRounds = Array.from(byRound.entries()).sort((a, b) => a[0] - b[0]);

  const myRank = participant
    ? (await prisma.eventParticipant.count({
        where: { eventId: arena.id, balance: { gt: participant.balance } },
      })) + 1
    : null;

  const roundsWon = myRounds.filter(([, r]) => r.payout - r.staked > 0).length;

  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="label">{arena.hostName ?? arena.organizer.name}</div>
            <h1 className="font-display mt-1 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
              {arena.name}
            </h1>
            <p className="mt-2 text-sm text-fg-muted">
              {arena.asset} · {rounds.length} of {arena.totalRounds} rounds settled ·{' '}
              {leaderboard.participantCount} traders
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={arena.status} />
            {arena.status !== 'ENDED' ? (
              <Link href={`/arenas/${arena.code}/live`} className="btn-secondary text-sm">
                Back to trading
              </Link>
            ) : null}
          </div>
        </header>

        {participant ? (
          <section>
            <h2 className="label mb-3">Your event</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Final rank"
                value={myRank !== null ? ordinal(myRank) : '—'}
                hint={`of ${leaderboard.participantCount}`}
              />
              <Stat
                label="Balance"
                value={formatPoints(participant.balance, 0)}
                hint={`started at ${formatPoints(arena.startingBalance, 0)}`}
              />
              <Stat
                label="Profit / loss"
                value={formatSignedPoints(participant.balance - arena.startingBalance, 0)}
                tone={participant.balance >= arena.startingBalance ? 'yes' : 'no'}
              />
              <Stat
                label="Rounds won"
                value={`${roundsWon} / ${myRounds.length}`}
                hint="rounds you traded"
              />
            </div>
          </section>
        ) : null}

        {market.resolvedRounds > 0 ? (
          <section className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
                Was the room right?
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-fg-muted">
                Every round the market settled on a probability before the candle closed.
                This is how those forecasts held up.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                label="Average error"
                value={market.crowdBrier !== null ? formatProbability(market.crowdBrier, 0) : '—'}
                hint="lower is a sharper market"
              />
              <Stat
                label="Total volume"
                value={<Arcs value={market.totalVolume} decimals={0} />}
                hint={`${market.totalTrades} trades`}
              />
              <Stat
                label="Busiest round"
                value={market.busiestRound ? `R${market.busiestRound.roundNumber}` : '—'}
                hint={
                  market.busiestRound
                    ? <Arcs value={market.busiestRound.volume} decimals={0} />
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
                  <div className="label mb-2">How the candles actually closed</div>
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

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          {/* min-w-0 matters here: without it these grid children size to their
              widest content, and the min-w tables below would drag the whole
              page wider than a phone screen instead of scrolling inside their
              own overflow-x-auto panel. */}
          <section className="min-w-0">
            <h2 className="label mb-3">Final leaderboard</h2>
            {leaderboard.entries.length === 0 ? (
              <EmptyState
                title="No traders yet"
                body="Nobody has joined this arena, so there is nothing to rank."
              />
            ) : (
              <Leaderboard
                data={leaderboard}
                limit={50}
                showPnl={false}
                highlightParticipantId={participant?.id ?? null}
              />
            )}
          </section>

          <section className="flex min-w-0 flex-col gap-6">
            {participant ? (
              <div>
                <h2 className="label mb-3">Your round-by-round</h2>
                {myRounds.length === 0 ? (
                  <Panel className="p-6 text-sm text-fg-muted">
                    You did not place a trade in this arena.
                  </Panel>
                ) : (
                  <Panel className="overflow-x-auto">
                    <table className="w-full min-w-[26rem] text-sm">
                      <thead>
                        <tr className="border-b border-line text-left">
                          <Th>Round</Th>
                          <Th>Side</Th>
                          <Th>Result</Th>
                          <Th className="text-right">Staked</Th>
                          <Th className="text-right">P/L</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {myRounds.map(([roundNumber, entry]) => {
                          const pnl = entry.payout - entry.staked;
                          return (
                            <tr key={roundNumber} className="border-b border-line last:border-0">
                              <Td className="tnum font-semibold">{roundNumber}</Td>
                              <Td>
                                <span className="flex gap-1">
                                  {Array.from(entry.sides).map((side) => (
                                    <Badge key={side} tone={side === 'YES' ? 'yes' : 'no'}>
                                      {side}
                                    </Badge>
                                  ))}
                                </span>
                              </Td>
                              <Td>
                                <OutcomeBadge outcome={entry.outcome} />
                              </Td>
                              <Td className="tnum text-right text-fg-muted">
                                {formatPoints(entry.staked)}
                              </Td>
                              <Td
                                className={cx(
                                  'tnum text-right font-semibold',
                                  pnl > 0 ? 'text-yes' : pnl < 0 ? 'text-no' : 'text-fg-muted',
                                )}
                              >
                                {formatSignedPoints(pnl)}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </Panel>
                )}
              </div>
            ) : null}

            <div>
              <h2 className="label mb-3">Every round</h2>
              {rounds.length === 0 ? (
                <Panel className="p-6 text-sm text-fg-muted">
                  No rounds have settled yet.
                </Panel>
              ) : (
                <Panel className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left">
                        <Th>#</Th>
                        <Th>Open</Th>
                        <Th>Close</Th>
                        <Th>Result</Th>
                        <Th className="text-right">Final YES</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((round) => (
                        <tr key={round.id} className="border-b border-line last:border-0">
                          <Td className="tnum font-semibold">{round.roundNumber}</Td>
                          <Td className="tnum text-fg-muted">{formatPrice(round.openPrice)}</Td>
                          <Td className="tnum text-fg-muted">{formatPrice(round.closePrice)}</Td>
                          <Td>
                            <OutcomeBadge outcome={round.outcome} />
                            {round.voidReason ? (
                              <div className="mt-1 text-[11px] text-fg-faint">
                                {round.voidReason}
                              </div>
                            ) : null}
                          </Td>
                          <Td className="tnum text-right text-fg-muted">
                            {formatProbability(
                              round.qYes + round.qNo === 0
                                ? 0.5
                                : 1 /
                                    (1 +
                                      Math.exp(
                                        (round.qNo - round.qYes) / arena.liquidityParamB,
                                      )),
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              )}
            </div>
          </section>
        </div>
      </div>
    </SiteShell>
  );
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <span className="text-fg-faint">—</span>;
  if (outcome === 'VOID') return <Badge tone="warn">VOID</Badge>;
  return <Badge tone={outcome === 'YES' ? 'yes' : 'no'}>{outcome}</Badge>;
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={cx('px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-faint', className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cx('px-4 py-2.5 align-top', className)}>{children}</td>;
}
