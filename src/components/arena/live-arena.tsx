'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { LeaderboardStrip, Leaderboard } from '@/components/arena/leaderboard';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { RoundCounter, RoundTimer, roundPhase } from '@/components/arena/round-timer';
import { TradePanel } from '@/components/arena/trade-panel';
import { TradeTape } from '@/components/arena/trade-tape';
import { useArena } from '@/hooks/use-arena';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

// The charting library touches `window` at import time and adds ~50KB, neither
// of which belongs in the server render of a screen people open on 4G.
const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  {
    ssr: false,
    loading: () => <div className="h-[200px] animate-pulse rounded bg-ink-800" />,
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
          ? 'Trading is locked while the round settles.'
          : phase === 'resolved'
            ? 'Round settled — the next one opens shortly.'
            : 'Trading is closed.';

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
        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">
            {error} — retrying automatically.
          </p>
        </div>
      ) : null}

      {/*
        Ordering is deliberate and differs by device.

        On a phone the sequence is: the two numbers people stare at, then the
        trade controls, then the chart. The buy buttons have to sit inside the
        first viewport — a participant with twenty seconds left should never
        have to scroll past a chart to reach them.

        On a desktop or projector there is room for both, so the chart takes the
        wide left column and the trade panel sits beside it.
      */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 px-3 py-3 sm:px-6 sm:py-5 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <div className="order-1 flex flex-col gap-3 lg:col-start-1 lg:row-start-1">
          {/* The two numbers people stare at, side by side and as large as the
              viewport allows. */}
          <section className="panel hud relative overflow-hidden p-4 sm:p-5">
            <div className="bloom pointer-events-none absolute inset-0 opacity-60" aria-hidden />
            <div className="relative grid grid-cols-2 items-start gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="label">Chance it closes UP</div>
                <div
                  className={cx(
                    'font-display tnum text-4xl font-bold leading-none tracking-tight transition-colors sm:text-6xl',
                    priceYes >= 0.5 ? 'text-yes glow-yes' : 'text-no glow-no',
                  )}
                >
                  {formatProbability(priceYes, 1)}
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
                label="Round open"
                value={formatPrice(round?.openPrice)}
                tone={
                  price?.price != null && round?.openPrice != null
                    ? price.price > round.openPrice
                      ? 'yes'
                      : 'no'
                    : undefined
                }
              />
              <MiniStat label="Volume" value={`${formatPoints(round?.volume ?? 0, 0)} pts`} />
            </div>
          </section>

        </div>

        {/*
          Both sides of the market, live across the round.

          It sits after the trade controls on a phone for the same reason the
          candle chart does: the buy buttons must stay inside the first
          viewport. On desktop there is room, so it returns to the left column
          directly under the numbers it explains.
        */}
        <section className="panel order-3 p-3 sm:p-4 lg:col-start-1 lg:row-start-2">
          <div className="label mb-1.5">Probability this round</div>
          <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={80} />
        </section>

        {/* Chart: after the controls on a phone, left column on a desktop. */}
        <section className="panel order-3 overflow-hidden p-3 sm:p-4 lg:col-start-1 lg:row-start-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="label">{info.asset}</span>
            <span className="text-[11px] text-fg-faint">
              Blue line = this round&apos;s open
            </span>
          </div>
          <CandleChart
            code={code}
            openPrice={round?.openPrice ?? null}
            livePrice={price?.price ?? null}
            height={200}
          />
        </section>

        <section className="panel order-3 p-3 sm:p-4 lg:col-start-1 lg:row-start-4">
          <div className="mb-2 label">Trade tape</div>
          <TradeTape lastTrade={lastTrade} variant="compact" />
        </section>

        <section className="order-4 lg:hidden">
          <LeaderboardStrip
            data={leaderboard}
            participantId={viewer?.participantId ?? null}
            rank={viewer?.rank ?? null}
          />
        </section>

        {/* Trade controls: second on a phone, right column on a desktop. */}
        <div className="order-2 flex flex-col gap-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-24">
          <section className="panel p-3 sm:p-4">
            <div className="mb-3 flex items-baseline justify-between">
              <span className="label">Your balance</span>
              <span className="tnum text-2xl font-bold">
                {viewer?.balance != null ? formatPoints(viewer.balance) : '—'}
                <span className="ml-1 text-xs font-normal text-fg-faint">pts</span>
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

          <section className="panel hidden p-4 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <span className="label">Leaderboard</span>
              <span className="text-xs text-fg-faint">
                {leaderboard?.participantCount ?? 0} traders
              </span>
            </div>
            <Leaderboard
              data={leaderboard}
              limit={10}
              highlightParticipantId={viewer?.participantId ?? null}
            />
          </section>

          <div className="flex gap-2">
            <Link href={`/arenas/${code}/results`} className="btn-secondary flex-1 text-sm">
              Results
            </Link>
            <Link href="/dashboard" className="btn-ghost flex-1 text-sm">
              Dashboard
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
    <header className="safe-top safe-x sticky top-0 z-30 border-b border-line bg-ink-950/85 backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ConnectionDot connected={connected} />
            <h1 className="truncate text-sm font-bold sm:text-base">{info.name}</h1>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-fg-faint">
            <span>{info.asset}</span>
            <span aria-hidden>·</span>
            <span className="tnum">
              Round {currentRound > 0 ? currentRound : '—'} of {totalRounds}
            </span>
            {status !== 'LIVE' ? (
              <>
                <span aria-hidden>·</span>
                <span className="uppercase">{status === 'LOBBY' ? 'waiting' : status}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="label !text-[10px]">Balance</div>
          <div className="tnum text-base font-bold leading-tight sm:text-lg">
            {balance != null ? formatPoints(balance, 0) : '—'}
          </div>
        </div>
      </div>
    </header>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span
      className="flex shrink-0 items-center"
      title={connected ? 'Live' : 'Reconnecting…'}
      aria-label={connected ? 'Connected' : 'Reconnecting'}
    >
      <span
        className={cx(
          'h-2 w-2 rounded-full',
          connected ? 'bg-yes' : 'animate-pulse bg-warn',
        )}
      />
    </span>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'yes' | 'no';
}) {
  return (
    <div>
      <div className="label !text-[10px]">{label}</div>
      <div
        className={cx(
          'tnum mt-0.5 text-sm font-semibold',
          tone === 'yes' && 'text-yes',
          tone === 'no' && 'text-no',
        )}
      >
        {value}
      </div>
    </div>
  );
}

/** A short-lived banner announcing how the round just settled. */
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
        isVoid
          ? 'border-warn/40 bg-warn/10'
          : isYes
            ? 'border-yes/40 bg-yes/10'
            : 'border-no/40 bg-no/10',
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="font-bold">Round {settled.roundNumber}</span>
        <span
          className={cx(
            'font-bold',
            isVoid ? 'text-warn' : isYes ? 'text-yes' : 'text-no',
          )}
        >
          {isVoid ? 'VOID — everyone refunded' : isYes ? 'closed UP · YES' : 'closed DOWN · NO'}
        </span>
        {!isVoid && settled.openPrice != null && settled.closePrice != null ? (
          <span className="tnum text-fg-muted">
            {formatPrice(settled.openPrice)} → {formatPrice(settled.closePrice)}
          </span>
        ) : null}
        {isVoid && settled.voidReason ? (
          <span className="text-fg-muted">{settled.voidReason}</span>
        ) : null}
      </div>
    </div>
  );
}
