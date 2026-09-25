'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { LeaderboardStrip, Leaderboard } from '@/components/arena/leaderboard';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { RoundTimer, roundPhase } from '@/components/arena/round-timer';
import { TradePanel } from '@/components/arena/trade-panel';
import { TradeTape } from '@/components/arena/trade-tape';
import { StatusPill } from '@/components/ui';
import { useArena } from '@/hooks/use-arena';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  {
    ssr: false,
    loading: () => <div className="h-[220px] animate-pulse rounded-lg bg-ink-800" />,
  },
);

export function LiveArena({ initialArena }: { initialArena: ArenaPublicInfo }) {
  const code = initialArena.code;
  const {
    snapshot,
    round,
    leaderboard,
    arena,
    price,
    lastTrade,
    lastSettled,
    connected,
    error,
    clockOffsetMs,
    refresh,
  } = useArena(code);

  const [expanded, setExpanded] = useState(false);

  // Expanded chart: Escape to close, lock background scroll.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const info = snapshot?.arena ?? initialArena;
  const viewer = snapshot?.viewer ?? null;
  const status = arena?.status ?? info.status;

  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const tradingOpen = status === 'LIVE' && phase === 'trading';
  const priceYes = round?.priceYes ?? 0.5;

  const disabledReason =
    status === 'ENDED'
      ? 'This arena has finished.'
      : status !== 'LIVE'
        ? 'Waiting for the organizer to start the next round.'
        : phase === 'locked' || phase === 'closing'
          ? 'Locked — resolving.'
          : phase === 'resolved'
            ? 'Settled — next round shortly.'
            : 'Trading is closed.';

  const lockTimeMs = round?.locksAt ? new Date(round.locksAt).getTime() : null;

  return (
    <div className="safe-bottom flex min-h-[100dvh] flex-col bg-ink-950">
      <StickyHeader
        info={info}
        balance={viewer?.balance ?? null}
        connected={connected}
        currentRound={arena?.currentRound ?? info.currentRound}
        totalRounds={info.totalRounds}
        status={status}
      />

      {lastSettled ? <SettlementBanner settled={lastSettled} /> : null}

      {error ? (
        <div className="mx-auto w-full max-w-7xl px-4 pt-3">
          <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
            {error} — retrying automatically.
          </p>
        </div>
      ) : null}

      {/*
        Mobile order: market numbers → order entry → chart → momentum/tape.
        Desktop: market + chart left, sticky ticket right.
      */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.9fr)] lg:items-start lg:gap-4">
        <div className="order-1 flex min-w-0 flex-col gap-3">
          {/* Market identity + probability */}
          <section className="rounded-xl border border-line bg-ink-900 p-4 sm:p-5" aria-label="Market overview">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-fg-faint">
                  <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono uppercase tracking-wider">{info.asset}</span>
                  <StatusPill status={status} />
                </div>
                <h2 className="mt-2 text-lg font-extrabold tracking-tight text-fg sm:text-xl">
                  Closes UP from the open?
                </h2>
                <div className="mt-2.5 flex items-baseline gap-2">
                  <span className={cx('tnum text-5xl font-extrabold tracking-tight sm:text-6xl', priceYes >= 0.5 ? 'text-yes' : 'text-no')}>
                    {formatProbability(priceYes, 0)}
                  </span>
                  <span className="text-[13px] font-semibold text-fg-faint">YES</span>
                </div>
              </div>
              <RoundTimer round={round} clockOffsetMs={clockOffsetMs} />
            </div>

            <div className="mt-4">
              <ProbabilityBar value={priceYes} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
              <MiniStat label="Live" value={formatPrice(price?.price)} />
              <MiniStat
                label="Strike"
                value={formatPrice(round?.openPrice)}
                tone={price?.price != null && round?.openPrice != null ? (price.price > round.openPrice ? 'yes' : 'no') : undefined}
              />
              <MiniStat label="Volume" value={<Arcs value={round?.volume ?? 0} decimals={0} />} />
            </div>
          </section>

          {/* Chart — expands into an overlay, same instance, no remount */}
          {expanded ? (
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
              onClick={() => setExpanded(false)}
              aria-hidden
            />
          ) : null}
          <section
            className={cx(
              'rounded-xl border border-line bg-ink-900 p-3 sm:p-4',
              expanded && 'fixed inset-3 z-50 overflow-y-auto shadow-elevated sm:inset-6',
            )}
            aria-label="Price chart"
            role={expanded ? 'dialog' : undefined}
            aria-modal={expanded ? true : undefined}
          >
            {expanded ? (
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-sm font-extrabold text-fg">
                  {info.name} · {info.asset}
                </span>
                <span className="tnum font-mono text-xs text-fg-faint">Esc to close</span>
              </div>
            ) : null}
            <CandleChart
              code={code}
              openPrice={round?.openPrice ?? null}
              livePrice={price?.price ?? null}
              height={expanded ? Math.max(440, Math.floor(window.innerHeight * 0.66)) : 220}
              lockTimeMs={lockTimeMs}
              showToolbar
              expanded={expanded}
              onToggleExpand={() => setExpanded((v) => !v)}
              assetLabel={`${info.asset} / USDT`}
            />
          </section>

          <div className="grid gap-3 xl:grid-cols-2">
            <section className="rounded-xl border border-line bg-ink-900 p-3 sm:p-4" aria-label="YES momentum">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">YES momentum</span>
                <span className="tnum font-mono text-[11px] text-fg-faint">IST</span>
              </div>
              <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={110} />
            </section>
            <section className="rounded-xl border border-line bg-ink-900 p-3 sm:p-4" aria-label="Trade tape">
              <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">Tape</div>
              <TradeTape lastTrade={lastTrade} variant="compact" />
            </section>
          </div>

          <section className="lg:hidden" aria-label="Top traders">
            <LeaderboardStrip data={leaderboard} participantId={viewer?.participantId ?? null} rank={viewer?.rank ?? null} />
          </section>
        </div>

        {/* Order entry + portfolio column */}
        <div className="order-2 flex min-w-0 flex-col gap-3 lg:sticky lg:top-20">
          <section className="rounded-xl border border-line bg-ink-900 p-4" aria-label="Order entry">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">Available</span>
              <span className="text-xl font-extrabold text-fg">
                {viewer?.balance != null ? <Arcs value={viewer.balance} decimals={0} /> : '—'}
              </span>
            </div>

            <TradePanel
              code={code}
              balance={viewer?.balance ?? 0}
              maxStakePerTrade={info.maxStakePerTrade}
              liquidityParamB={info.liquidityParamB}
              qYes={round?.qYes ?? 0}
              qNo={round?.qNo ?? 0}
              priceYes={priceYes}
              position={viewer?.position ?? null}
              tradingOpen={tradingOpen}
              disabledReason={disabledReason}
              onFilled={() => void refresh()}
            />
          </section>

          <section id="leaderboard" className="hidden scroll-mt-24 rounded-xl border border-line bg-ink-900 p-4 lg:block" aria-label="Leaderboard">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-faint">Leaderboard</span>
              <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs font-bold text-fg-muted">
                {leaderboard?.participantCount ?? 0}
              </span>
            </div>
            <Leaderboard data={leaderboard} limit={8} highlightParticipantId={viewer?.participantId ?? null} />
          </section>

          <div className="flex gap-2">
            <Link href={`/arenas/${code}/results`} className="btn-secondary min-h-[40px] flex-1 text-sm">
              Results
            </Link>
            <Link href="/dashboard" className="btn-ghost min-h-[40px] flex-1 text-sm">
              Portfolio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StickyHeader({
  info,
  balance,
  connected,
  currentRound,
  totalRounds,
  status,
}: {
  info: ArenaPublicInfo;
  balance: number | null;
  connected: boolean;
  currentRound: number;
  totalRounds: number;
  status: string;
}) {
  return (
    <header className="safe-top safe-x glass-elevated sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <Link
          href="/markets"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink-800 text-fg-muted transition-colors hover:bg-ink-750 hover:text-fg"
          aria-label="Back to markets"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cx('h-2 w-2 shrink-0 rounded-full', connected ? 'bg-yes' : 'animate-pulse bg-warn')} role="status" aria-label={connected ? 'Connected' : 'Reconnecting'} />
            <h1 className="truncate text-sm font-bold text-fg sm:text-[15px]">{info.name}</h1>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-fg-faint">
            <span className="font-mono uppercase">{info.code}</span>
            <span aria-hidden>·</span>
            <span>{info.asset}</span>
            <span aria-hidden>·</span>
            <span className="tnum">R{currentRound > 0 ? currentRound : '–'}/{totalRounds}</span>
            <span aria-hidden>·</span>
            <span className="uppercase">{status === 'LOBBY' ? 'Open' : status}</span>
          </div>
        </div>

        <div className="shrink-0 rounded-lg border border-line bg-ink-900 px-3 py-1.5 text-right">
          <div className="text-[10px] font-bold uppercase leading-none tracking-[0.08em] text-fg-faint">Arcs</div>
          <div className="tnum mt-0.5 text-[15px] font-extrabold leading-tight text-fg">
            {balance != null ? <Arcs value={balance} decimals={0} /> : '—'}
          </div>
        </div>
      </div>
    </header>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'yes' | 'no' }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className={cx('tnum mt-0.5 text-sm font-extrabold text-fg', tone === 'yes' && 'text-yes', tone === 'no' && 'text-no')}>
        {value}
      </div>
    </div>
  );
}

function SettlementBanner({
  settled,
}: {
  settled: { roundNumber: number; outcome: string; openPrice: number | null; closePrice: number | null; voidReason: string | null };
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 8000);
    return () => clearTimeout(timer);
  }, [settled.roundNumber, settled.outcome]);

  if (!visible) return null;

  const isVoid = settled.outcome === 'VOID';
  const isYes = settled.outcome === 'YES';

  return (
    <div
      className={cx(
        'safe-x animate-rise border-b px-4 py-2.5',
        isVoid ? 'border-warn/30 bg-warn/10' : isYes ? 'border-yes/30 bg-yes/10' : 'border-no/30 bg-no/10',
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-bold text-fg">R{settled.roundNumber}</span>
        <span className={cx('font-bold', isVoid ? 'text-warn' : isYes ? 'text-yes' : 'text-no')}>
          {isVoid ? 'VOID — stakes refunded' : isYes ? 'UP · YES wins' : 'DOWN · NO wins'}
        </span>
        {!isVoid && settled.openPrice != null && settled.closePrice != null ? (
          <span className="tnum text-fg-muted">
            {formatPrice(settled.openPrice)} → {formatPrice(settled.closePrice)}
          </span>
        ) : null}
        {isVoid && settled.voidReason ? <span className="text-fg-muted">{settled.voidReason}</span> : null}
      </div>
    </div>
  );
}
