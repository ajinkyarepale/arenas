import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CalibrationChart, EquityCurve, SplitBar } from '@/components/charts';
import { SiteShell } from '@/components/site-shell';
import { EmptyState, Panel, StatusPill } from '@/components/ui';
import { auth, isOrganizer } from '@/lib/auth';
import { getTraderAnalytics } from '@/lib/analytics';
import {
  cx,
  formatDateTime,
  formatPercent,
  formatPoints,
  formatSignedPoints,
  ordinal,
} from '@/lib/format';
import { getProfile, type ProfileArena } from '@/lib/profile';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?callbackUrl=/dashboard');

  const [{ stats, arenas }, analytics] = await Promise.all([
    getProfile(session.user.id),
    getTraderAnalytics(session.user.id),
  ]);

  const active = arenas.filter((a) => a.arena.status === 'LIVE' || a.arena.status === 'LOBBY');
  const past = arenas.filter((a) => a.arena.status === 'ENDED');

  const yes = analytics.sides.find((s) => s.side === 'YES');
  const no = analytics.sides.find((s) => s.side === 'NO');
  const hasHistory = analytics.settledTrades > 0;

  return (
    <SiteShell width="wide">
      <div className="flex flex-col gap-10">
        {/* --- Masthead: the number that matters, over the curve that made it --- */}
        <section className="panel hud grid-field scanlines relative overflow-hidden">
          <div
            className="bloom pointer-events-none absolute left-0 top-0 h-96 w-[40rem] -translate-y-1/3"
            aria-hidden
          />
          {hasHistory ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-70">
              <EquityCurve points={analytics.equity} height={150} />
            </div>
          ) : null}

          <div className="relative flex flex-col gap-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="label flex items-center gap-2">
                  <span className="inline-block h-px w-6 bg-accent/70" aria-hidden />
                  {session.user.email}
                </div>
                <h1 className="font-display mt-1 text-4xl font-bold uppercase tracking-tight sm:text-5xl">
                  {session.user.name?.split(' ')[0] ?? 'Trader'}
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/markets" className="btn-secondary text-sm">
                  Browse markets
                </Link>
                {isOrganizer(session.user.role) ? (
                  <Link href="/admin" className="btn-primary text-sm">
                    Organizer tools
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
              <div>
                <div className="label">Career P/L</div>
                <div
                  className={cx(
                    'font-display tnum text-5xl font-bold leading-none sm:text-6xl',
                    analytics.netPnl > 0
                      ? 'text-yes glow-yes'
                      : analytics.netPnl < 0
                        ? 'text-no glow-no'
                        : 'text-fg',
                  )}
                >
                  {hasHistory ? formatSignedPoints(analytics.netPnl, 0) : '—'}
                </div>
              </div>

              <KeyFigure
                label="Return on stake"
                value={analytics.roi !== null ? formatPercent(analytics.roi, 1) : '—'}
                tone={analytics.roi !== null ? (analytics.roi >= 0 ? 'yes' : 'no') : undefined}
              />
              <KeyFigure
                label="Hit rate"
                value={analytics.hitRate !== null ? formatPercent(analytics.hitRate, 0) : '—'}
                hint={hasHistory ? `${analytics.settledTrades} settled trades` : undefined}
              />
              <KeyFigure
                label="Streak"
                value={
                  analytics.currentStreak
                    ? `${analytics.currentStreak.length}${analytics.currentStreak.kind === 'win' ? 'W' : 'L'}`
                    : '—'
                }
                tone={analytics.currentStreak?.kind === 'win' ? 'yes' : analytics.currentStreak ? 'no' : undefined}
                hint={analytics.longestWinStreak > 0 ? `best ${analytics.longestWinStreak}W` : undefined}
              />
            </div>
          </div>
        </section>

        {searchParams.error === 'organizer-only' ? (
          <p className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
            That area is for organizers. If you are running an event, ask an admin to
            upgrade your account.
          </p>
        ) : null}

        {/* --- Are you actually any good? --- */}
        {hasHistory ? (
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            <Panel className="flex min-w-0 flex-col gap-3 p-5">
              <div>
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight">Calibration</h2>
                <p className="mt-1 text-sm text-fg-muted">
                  When you pay 70 for a share, it should win about 70% of the time. Dots on
                  the dashed line mean your prices match reality.
                </p>
              </div>

              <CalibrationChart buckets={analytics.calibration} height={210} />

              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="label">Average miss</span>
                <span
                  className={cx(
                    'tnum text-lg font-bold',
                    analytics.calibrationError === null
                      ? 'text-fg-muted'
                      : analytics.calibrationError < 0.1
                        ? 'text-yes'
                        : analytics.calibrationError < 0.2
                          ? 'text-warn'
                          : 'text-no',
                  )}
                >
                  {analytics.calibrationError !== null
                    ? formatPercent(analytics.calibrationError, 1)
                    : 'needs more trades'}
                </span>
              </div>
            </Panel>

            <div className="flex min-w-0 flex-col gap-4">
              <Panel className="p-5">
                <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
                  How you trade
                </h2>

                <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4">
                  <Figure
                    label="Average entry"
                    value={
                      analytics.avgEntryPrice !== null
                        ? formatPercent(analytics.avgEntryPrice, 0)
                        : '—'
                    }
                    hint={
                      analytics.avgEntryPrice === null
                        ? undefined
                        : analytics.avgEntryPrice < 0.45
                          ? 'you back underdogs'
                          : analytics.avgEntryPrice > 0.55
                            ? 'you back favourites'
                            : 'balanced'
                    }
                  />
                  <Figure
                    label="Points staked"
                    value={formatPoints(analytics.totalStaked, 0)}
                    hint={`${formatPoints(analytics.totalReturned, 0)} returned`}
                  />
                  <Figure
                    label="Best trade"
                    value={
                      analytics.bestTrade
                        ? formatSignedPoints(analytics.bestTrade.pnl, 0)
                        : '—'
                    }
                    hint={
                      analytics.bestTrade
                        ? `${analytics.bestTrade.arenaCode} R${analytics.bestTrade.roundNumber}`
                        : undefined
                    }
                    tone="yes"
                  />
                  <Figure
                    label="Worst trade"
                    value={
                      analytics.worstTrade
                        ? formatSignedPoints(analytics.worstTrade.pnl, 0)
                        : '—'
                    }
                    hint={
                      analytics.worstTrade
                        ? `${analytics.worstTrade.arenaCode} R${analytics.worstTrade.roundNumber}`
                        : undefined
                    }
                    tone="no"
                  />
                </dl>

                {yes && no && yes.trades + no.trades > 0 ? (
                  <div className="mt-5 border-t border-line pt-4">
                    <div className="label mb-2">Side preference</div>
                    <SplitBar
                      left={yes.trades}
                      right={no.trades}
                      leftLabel={`YES ${yes.trades} · ${formatSignedPoints(yes.netPnl, 0)}`}
                      rightLabel={`${formatSignedPoints(no.netPnl, 0)} · ${no.trades} NO`}
                    />
                  </div>
                ) : null}
              </Panel>

              <Panel className="p-5">
                <div className="label mb-3">Career</div>
                <dl className="grid grid-cols-3 gap-4">
                  <Figure label="Arenas" value={stats.arenasPlayed} />
                  <Figure
                    label="Rounds won"
                    value={`${stats.roundsWon}/${stats.roundsTraded}`}
                  />
                  <Figure label="Podiums" value={stats.podiums} />
                </dl>
              </Panel>
            </div>
          </section>
        ) : null}

        {/* --- Arenas --- */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
              Live and upcoming
            </h2>
            {active.length > 0 ? (
              <span className="text-sm text-fg-faint">{active.length} active</span>
            ) : null}
          </div>

          {active.length === 0 ? (
            <EmptyState
              title="No arenas right now"
              body="When your organizer gives you a join code, enter it and you will show up here."
              action={{ href: '/markets', label: 'Browse upcoming markets' }}
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {active.map((entry) => (
                <ArenaRow key={entry.participantId} entry={entry} />
              ))}
            </ul>
          )}
        </section>

        {past.length > 0 ? (
          <section>
            <h2 className="font-display mb-3 text-2xl font-bold uppercase tracking-tight">Finished</h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {past.map((entry) => (
                <ArenaRow key={entry.participantId} entry={entry} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SiteShell>
  );
}

function KeyFigure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'yes' | 'no';
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div
        className={cx(
          'tnum mt-0.5 text-2xl font-bold leading-none',
          tone === 'yes' && 'text-yes',
          tone === 'no' && 'text-no',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-[11px] text-fg-faint">{hint}</div> : null}
    </div>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'yes' | 'no';
}) {
  return (
    <div className="min-w-0">
      <dt className="label !text-[10px]">{label}</dt>
      <dd
        className={cx(
          'tnum mt-0.5 truncate text-lg font-bold',
          tone === 'yes' && 'text-yes',
          tone === 'no' && 'text-no',
        )}
      >
        {value}
      </dd>
      {hint ? <div className="truncate text-[11px] text-fg-faint">{hint}</div> : null}
    </div>
  );
}

function ArenaRow({ entry }: { entry: ProfileArena }) {
  const { arena } = entry;
  const ended = arena.status === 'ENDED';

  return (
    <li>
      <Panel className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="label">{arena.host}</div>
            <h3 className="mt-1 truncate text-base font-bold">{arena.name}</h3>
          </div>
          <StatusPill status={arena.status} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
          <div>
            <div className="label !text-[10px]">Balance</div>
            <div className="tnum mt-0.5 text-lg font-bold">
              {formatPoints(entry.balance, 0)}
            </div>
          </div>
          <div>
            <div className="label !text-[10px]">P/L</div>
            <div
              className={cx(
                'tnum mt-0.5 text-lg font-bold',
                entry.pnl > 0 ? 'text-yes' : entry.pnl < 0 ? 'text-no' : 'text-fg-muted',
              )}
            >
              {formatSignedPoints(entry.pnl, 0)}
            </div>
          </div>
          <div>
            <div className="label !text-[10px]">Rank</div>
            <div className="tnum mt-0.5 text-lg font-bold">
              {ordinal(entry.rank)}
              <span className="text-xs font-normal text-fg-faint">
                {' '}
                / {entry.participantCount}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-fg-faint">
          {arena.status === 'LIVE'
            ? `Round ${arena.currentRound} of ${arena.totalRounds} in play`
            : ended
              ? `Finished · ${entry.roundsWon}/${entry.roundsTraded} rounds won`
              : `Starts ${formatDateTime(arena.scheduledFor)}`}
        </p>

        <div className="mt-4 flex gap-2 pt-1">
          {ended ? (
            <Link href={`/arenas/${arena.code}/results`} className="btn-secondary flex-1 text-sm">
              Results
            </Link>
          ) : (
            <>
              <Link href={`/arenas/${arena.code}/live`} className="btn-primary flex-1 text-sm">
                {arena.status === 'LIVE' ? 'Trade now' : 'Open'}
              </Link>
              <Link href={`/arenas/${arena.code}/results`} className="btn-ghost text-sm">
                History
              </Link>
            </>
          )}
        </div>
      </Panel>
    </li>
  );
}
