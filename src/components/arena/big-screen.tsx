'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { Leaderboard } from '@/components/arena/leaderboard';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { RoundTimer, roundPhase } from '@/components/arena/round-timer';
import { TradeTape } from '@/components/arena/trade-tape';
import { useArena } from '@/hooks/use-arena';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded bg-ink-800" /> },
);

/**
 * The projector view.
 *
 * Designed to be read from the back of a lecture hall: no controls, no
 * interaction, nothing hover-dependent, and the two numbers that matter — the
 * implied probability and the countdown — sized to fill a wall. It authenticates
 * nobody, because a projector should never be logged into a participant account.
 */
export function BigScreen({ initialArena }: { initialArena: ArenaPublicInfo }) {
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
    clockOffsetMs,
  } = useArena(code);

  const info = snapshot?.arena ?? initialArena;
  const status = arena?.status ?? info.status;
  const currentRound = arena?.currentRound ?? info.currentRound;
  const priceYes = round?.priceYes ?? 0.5;
  const phase = roundPhase(round, Date.now() + clockOffsetMs);

  const priceUp =
    price?.price != null && round?.openPrice != null ? price.price > round.openPrice : null;

  return (
    <div className="scanlines relative flex h-[100dvh] w-full flex-col overflow-hidden bg-ink-950 p-4 xl:p-6">
      {/* Ground plane + bloom behind everything on the wall. */}
      <div className="grid-field pointer-events-none absolute inset-0 opacity-50" aria-hidden />
      <div
        className="bloom pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/4"
        aria-hidden
      />

      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between gap-6 border-b border-line pb-4">
        <div className="min-w-0">
          <h1 className="font-display truncate text-3xl font-bold uppercase tracking-tight xl:text-5xl">
            {info.name}
          </h1>
          <p className="mt-1 text-lg text-fg-muted xl:text-2xl">
            {info.hostName ?? info.organizerName} · {info.asset} · join code{' '}
            <span className="font-mono font-bold text-accent-light">{info.code}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-8">
          <div className="text-right">
            <div className="label !text-sm !tracking-[0.2em]">Round</div>
            <div className="font-display tnum text-5xl font-bold leading-none xl:text-7xl">
              {currentRound > 0 ? currentRound : '—'}
              <span className="text-fg-faint"> / {info.totalRounds}</span>
            </div>
          </div>
          <StatusLamp status={status} connected={connected} />
        </div>
      </header>

      {/* Main */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 py-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-6">
        {/* Chart column */}
        <section className="flex min-h-0 flex-col gap-4">
          <div className="panel flex min-h-0 flex-1 flex-col p-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="label !text-sm !tracking-[0.2em]">{info.asset}</span>
              <div className="flex items-baseline gap-5">
                <span className="text-lg text-fg-faint">
                  open{' '}
                  <span className="tnum font-semibold text-fg-muted">
                    {formatPrice(round?.openPrice)}
                  </span>
                </span>
                <span
                  className={cx(
                    'font-display tnum text-4xl font-bold xl:text-5xl',
                    priceUp === true && 'text-yes',
                    priceUp === false && 'text-no',
                  )}
                >
                  {formatPrice(price?.price)}
                </span>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
            </div>
          </div>

          <div className="panel shrink-0 p-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="label !text-sm !tracking-[0.2em]">
                Implied probability this round
              </span>
              <span className="flex items-center gap-2 text-lg text-fg-faint">
                <Arcs value={round?.volume ?? 0} decimals={0} /> traded ·{' '}
                {round?.tradeCount ?? 0} trades
              </span>
            </div>
            <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={100} />
          </div>
        </section>

        {/* Numbers + leaderboard column */}
        <section className="flex min-h-0 flex-col gap-4">
          <div className="panel hud relative shrink-0 overflow-hidden p-5">
            <div
              className="bloom pointer-events-none absolute inset-0 opacity-70"
              aria-hidden
            />
            <div className="relative">
              <div className="label !text-base !tracking-[0.2em]">Chance it closes UP</div>
              <div
                className={cx(
                  'tnum mt-1 text-mega font-extrabold leading-none tracking-tight transition-colors',
                  priceYes >= 0.5 ? 'text-yes' : 'text-no',
                )}
              >
                {formatProbability(priceYes, 1)}
              </div>
              <div className="mt-4">
                <ProbabilityBar value={priceYes} variant="display" />
              </div>
            </div>
          </div>

          <div className="panel hud shrink-0 p-5">
            <RoundTimer round={round} clockOffsetMs={clockOffsetMs} variant="display" />
          </div>

          <div className="panel shrink-0 max-h-40 overflow-hidden p-4">
            <div className="mb-2 label !text-sm !tracking-[0.2em]">Trade tape</div>
            <TradeTape lastTrade={lastTrade} variant="display" />
          </div>

          <div className="panel flex min-h-0 flex-1 flex-col p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between">
              <span className="label !text-base !tracking-[0.2em]">Leaderboard</span>
              <span className="text-lg text-fg-faint">
                {leaderboard?.participantCount ?? 0} traders
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Leaderboard data={leaderboard} limit={10} variant="display" />
            </div>
          </div>
        </section>
      </main>

      {/* Settlement flash */}
      {lastSettled ? <SettlementOverlay settled={lastSettled} /> : null}

      {status !== 'LIVE' ? (
        <IdleOverlay status={status} code={info.code} name={info.name} phase={phase} />
      ) : null}
    </div>
  );
}

/** Measures its box and hands the chart an explicit pixel height. */
function ChartFill({
  code,
  openPrice,
  livePrice,
}: {
  code: string;
  openPrice: number | null;
  livePrice: number | null;
}) {
  const [height, setHeight] = useState(360);
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(200, Math.floor(entry.contentRect.height));
      setHeight(next);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return (
    <div ref={setNode} className="h-full w-full">
      <CandleChart
        code={code}
        openPrice={openPrice}
        livePrice={livePrice}
        height={height}
        variant="display"
        candleLimit={120}
      />
    </div>
  );
}

function StatusLamp({ status, connected }: { status: string; connected: boolean }) {
  const live = status === 'LIVE';
  return (
    <div className="flex flex-col items-end gap-1">
      <div
        className={cx(
          'flex items-center gap-2.5 rounded-full border px-4 py-2 text-xl font-bold uppercase tracking-wider',
          live ? 'border-yes/50 bg-yes/12 text-yes' : 'border-line-strong bg-ink-800 text-fg-muted',
        )}
      >
        {live ? (
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yes opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-yes" />
          </span>
        ) : null}
        {status === 'LOBBY' ? 'Open' : status}
      </div>
      {!connected ? (
        <span className="text-sm text-warn">reconnecting…</span>
      ) : null}
    </div>
  );
}

function SettlementOverlay({
  settled,
}: {
  settled: {
    roundNumber: number;
    outcome: string;
    openPrice: number | null;
    closePrice: number | null;
    voidReason: string | null;
  };
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [settled.roundNumber, settled.outcome]);

  if (!visible) return null;

  const isVoid = settled.outcome === 'VOID';
  const isYes = settled.outcome === 'YES';

  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <div
        className={cx(
          'hud animate-rise rounded border-2 px-16 py-10 text-center backdrop-blur-md',
          isVoid
          ? 'border-warn bg-warn/15'
              : isYes
                ? 'border-yes/60 bg-ink-900'
                : 'border-no/60 bg-ink-900',
        )}
      >
        <div className="label !text-xl !tracking-[0.25em]">Round {settled.roundNumber}</div>
        <div
          className={cx(
            'mt-3 text-mega font-extrabold uppercase leading-none tracking-tight',
            isVoid ? 'text-warn' : isYes ? 'text-yes' : 'text-no',
          )}
        >
          {isVoid ? 'VOID' : isYes ? 'YES' : 'NO'}
        </div>
        <div className="mt-4 text-3xl font-semibold text-fg-muted">
          {isVoid
            ? 'Everyone refunded'
            : `${formatPrice(settled.openPrice)} → ${formatPrice(settled.closePrice)}`}
        </div>
      </div>
    </div>
  );
}

function IdleOverlay({
  status,
  code,
  name,
  phase,
}: {
  status: string;
  code: string;
  name: string;
  phase: string;
}) {
  if (status === 'ENDED') {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm">
        <div className="text-center">
          <div className="label !text-xl !tracking-[0.25em]">{name}</div>
          <div className="font-display mt-4 text-mega font-bold leading-none tracking-tight">
            Final results
          </div>
          <p className="mt-6 text-3xl text-fg-muted">
            Leaderboard below is final. Thanks for playing.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'LOBBY' || status === 'DRAFT') {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-ink-950/85 backdrop-blur-md">
        <div className="text-center">
          {/*
            The join card inverts: a solid pane of light blue against the dark
            room. On a projector this is the one thing people at the back need
            to read, so it is the brightest surface on the wall rather than
            another sheet of glass.
          */}
          <div className="mx-auto inline-block rounded-2xl bg-accent-light px-16 py-10 text-ink-950 shadow-[0_0_120px_-20px_rgba(163,201,255,0.75)]">
            <div className="font-display text-2xl font-semibold uppercase tracking-[0.25em] text-ink-900/70">
              Join to predict
            </div>
            <div className="font-display mt-3 text-mega font-bold leading-none tracking-[0.04em] text-ink-950">
              {code}
            </div>
            <div className="mt-4 text-xl font-medium text-ink-900/70">
              Enter this code at the arena page
            </div>
          </div>

          <p className="mt-10 text-4xl font-semibold text-fg-muted">
            Waiting for the first round to open
          </p>
          <p className="mt-3 text-2xl text-fg-faint">{name}</p>
        </div>
      </div>
    );
  }

  return null;
}
