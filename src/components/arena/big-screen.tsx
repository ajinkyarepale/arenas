'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { ArenaQRCodeCard } from '@/components/arena/arena-share-modal';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { roundPhase } from '@/components/arena/round-timer';
import { TradeTape } from '@/components/arena/trade-tape';
import { useArena, useCountdown } from '@/hooks/use-arena';
import { cx, formatCountdown, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-[#201f1f]" /> },
);

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

  const priceUp =
    price?.price != null && round?.openPrice != null ? price.price >= round.openPrice : null;
  const isCustomMarket = info.marketCategory !== 'CRYPTO_PRICE';
  const customQuestion = round?.question || info.question;
  const delta =
    price?.price != null && round?.openPrice != null ? price.price - round.openPrice : null;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#0a0a0c] text-[#e5e2e1] font-['Geist'] p-3 xl:p-4 antialiased">
      {/* Header with Centered Broadcast Countdown Timer */}
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-[#27272A] pb-2.5 mb-1.5">
        {/* Left: Event & Join Code Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[9px] font-bold text-[#22C55E] tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              {isCustomMarket ? 'CAMPUS PREDICTION ARENA' : 'BIG SCREEN PROJECTOR VIEW'}
            </div>
            {info.collegeName && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[9px] font-bold text-[#c4c7c8] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[11px]">school</span>
                <span>{info.collegeName}</span>
              </div>
            )}
          </div>
          <h1 className="font-['Geist'] text-lg sm:text-xl font-black tracking-tight text-white xl:text-2xl truncate">
            {info.name}
          </h1>
          <p className="mt-0.5 font-['Epilogue'] text-[11px] text-[#a1a1aa]">
            {info.hostName ?? info.organizerName} · {isCustomMarket ? 'Custom Market' : info.asset} · Code:{' '}
            <span className="font-mono font-bold text-[#22C55E] tracking-wider text-xs">{info.code}</span>
          </p>
        </div>

        {/* Center: Broadcast Countdown Clock with Live Winning Indicator */}
        <HeaderTimer
          round={round}
          clockOffsetMs={clockOffsetMs}
          openPrice={round?.openPrice ?? null}
          livePrice={price?.price ?? null}
        />

        {/* Right: Round Counter & Status */}
        <div className="flex shrink-0 items-center justify-end gap-4 flex-1">
          <div className="text-right">
            <div className="font-['Epilogue'] text-[10px] font-bold text-[#8e9192] uppercase tracking-wider">ROUND</div>
            <div className="font-['Epilogue'] text-xl sm:text-2xl font-black text-white leading-none xl:text-3xl">
              {currentRound > 0 ? currentRound : '—'}
              <span className="text-[#71717a] text-sm xl:text-base font-normal"> / {info.totalRounds}</span>
            </div>
          </div>
          <StatusLamp status={status} connected={connected} />
        </div>
      </header>

      {/* Main Grid: Left Market Visuals (60%) | Right Leaderboard (40%) */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 py-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-3.5">
        {/* Left Column: Live Chart + Probability Sentiment */}
        <section className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
          {isCustomMarket ? (
            <div className="bg-[#121215] border border-[#27272A] rounded-xl flex min-h-0 flex-1 flex-col justify-between p-5 shadow-lg">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#1c1c20] text-[#c4c7c8] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold uppercase tracking-widest">
                    LIVE PREDICTION QUESTION
                  </span>
                  <span className="font-['Epilogue'] text-xs text-[#a1a1aa]">
                    Round {currentRound > 0 ? currentRound : 1} of {info.totalRounds}
                  </span>
                </div>

                <h2 className="font-['Geist'] text-xl sm:text-3xl font-extrabold text-white leading-tight mt-1">
                  {customQuestion || info.name}
                </h2>

                {info.resolutionCriteria && (
                  <div className="p-3 bg-[#18181b] rounded-lg border border-[#27272a] text-xs text-[#a1a1aa]">
                    <strong className="text-white">Resolution Criteria:</strong> {info.resolutionCriteria}
                  </div>
                )}
              </div>

              {/* Large Implied Probability Bar */}
              <div className="flex flex-col gap-2 pt-4 border-t border-[#27272a]">
                <div className="flex justify-between items-end font-['Epilogue']">
                  <div>
                    <span className="text-[11px] text-[#a1a1aa] uppercase font-bold block mb-0.5">YES ODDS</span>
                    <span className="font-['Geist'] text-2xl sm:text-4xl font-extrabold text-[#22C55E]">
                      {formatProbability(priceYes, 1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-[#a1a1aa] uppercase font-bold block mb-0.5">NO ODDS</span>
                    <span className="font-['Geist'] text-2xl sm:text-4xl font-extrabold text-[#EF4444]">
                      {formatProbability(1 - priceYes, 1)}
                    </span>
                  </div>
                </div>
                <div className="h-4 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                  <div
                    className="h-full bg-[#22C55E] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#121215] border border-[#27272A] rounded-xl flex min-h-0 flex-[1.15] flex-col p-3 shadow-lg overflow-hidden">
              {/* Omnibook Style Compact Header */}
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1.5 shrink-0 border-b border-[#27272A]/80 pb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-['Epilogue'] text-xs font-bold text-white bg-[#1c1c20] px-2 py-0.5 rounded border border-[#27272A]">
                    {info.asset}
                  </span>
                  <span className="text-[11px] text-[#8e9192] font-['Epilogue']">
                    Open: <strong className="text-white font-mono">{formatPrice(round?.openPrice)}</strong>
                  </span>
                  {delta != null && (
                    <span
                      className={cx(
                        'font-["Epilogue"] text-[10px] px-2 py-0.5 rounded-full font-bold',
                        priceUp
                          ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                          : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
                      )}
                    >
                      {priceUp
                        ? `YES winning (+${delta.toFixed(2)})`
                        : `NO winning (-${Math.abs(delta).toFixed(2)})`}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-1.5 font-mono ml-auto">
                  <span className="text-[10px] text-[#71717a]">Live:</span>
                  <span
                    className={cx(
                      'text-lg xl:text-xl font-black tracking-tight',
                      priceUp === true ? 'text-[#22C55E]' : priceUp === false ? 'text-[#ef4444]' : 'text-white',
                    )}
                  >
                    {formatPrice(price?.price)}
                  </span>
                  {delta != null && (
                    <span
                      className={cx(
                        'text-[10px] font-bold font-mono px-1 py-0.5 rounded',
                        priceUp ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#EF4444] bg-[#EF4444]/10',
                      )}
                    >
                      {priceUp ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Chart Body */}
              <div className="min-h-0 flex-1 rounded-lg overflow-hidden border border-[#27272A]/70 bg-[#09090b]">
                <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
              </div>
            </div>
          )}

          {/* Probability & Market Sentiment Bottom Card */}
          <div className="bg-[#121215] border border-[#27272A] rounded-xl p-3 shadow-lg flex min-h-0 flex-1 flex-col justify-between gap-1.5 overflow-hidden">
            <div className="flex items-center justify-between font-['Epilogue'] text-[11px] border-b border-[#27272A]/80 pb-1 shrink-0">
              <span className="font-bold text-[#c4c7c8] uppercase tracking-wider">
                Implied Probability Trend
              </span>
              <span className="text-[#8e9192] text-[10px]">
                {formatPoints(round?.volume ?? 0, 0)} pts volume · {round?.tradeCount ?? 0} trades
              </span>
            </div>

            {/* Probability Trace Curve */}
            <div className="min-h-0 flex-1 w-full overflow-hidden flex items-center">
              <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={80} />
            </div>

            {/* Chance Bar at the bottom */}
            <div className="flex flex-col gap-1 shrink-0 pt-1 border-t border-[#27272A]/60">
              <div className="flex justify-between text-[11px] font-['Epilogue'] font-bold">
                <span className="text-[#22C55E]">YES {formatProbability(priceYes, 1)}</span>
                <span className="text-[#EF4444]">NO {formatProbability(1 - priceYes, 1)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Full-Height Live Leaderboard + Tape */}
        <section className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
          {/* Leaderboard Card */}
          <div className="bg-[#121215] border border-[#27272A] rounded-xl flex min-h-0 flex-1 flex-col p-3.5 shadow-lg">
            <div className="mb-2 flex shrink-0 items-center justify-between font-['Epilogue'] text-xs border-b border-[#27272A]/80 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white uppercase tracking-wider text-xs">TOURNAMENT LEADERBOARD</span>
                <span className="px-1.5 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[9px] font-bold">LIVE</span>
              </div>
              <span className="text-[#8e9192] font-mono text-[11px]">{leaderboard?.participantCount ?? 0} traders</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Leaderboard data={leaderboard} limit={12} variant="display" />
            </div>
          </div>

          {/* Compact Live Order Tape */}
          <div className="bg-[#121215] border border-[#27272A] rounded-xl max-h-28 overflow-hidden p-2.5 shrink-0 shadow-md">
            <div className="mb-1 font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider flex items-center justify-between">
              <span>Live Order Tape</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <TradeTape lastTrade={lastTrade} variant="display" />
          </div>
        </section>
      </main>

      {/* Settlement Flash */}
      {lastSettled ? <SettlementOverlay settled={lastSettled} /> : null}

      {status !== 'LIVE' ? (
        <IdleOverlay status={status} code={info.code} name={info.name} />
      ) : null}
    </div>
  );
}

function HeaderTimer({
  round,
  clockOffsetMs,
  openPrice,
  livePrice,
}: {
  round: any;
  clockOffsetMs: number;
  openPrice?: number | null;
  livePrice?: number | null;
}) {
  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const target =
    phase === 'resolved'
      ? (round?.settledAt
          ? new Date(new Date(round.settledAt).getTime() + 30_000).toISOString()
          : null)
      : phase === 'locked'
        ? (round?.resolvesAt ?? null)
        : (round?.locksAt ?? null);
  const remaining = useCountdown(target, clockOffsetMs);

  const phaseLabels: Record<string, string> = {
    waiting: 'Next round',
    trading: 'Trading closes in',
    closing: 'Closing soon',
    locked: 'Locked — resolving',
    resolved: 'Next round in',
  };

  const isUrgent = phase === 'closing' || phase === 'locked';
  const delta = livePrice != null && openPrice != null ? livePrice - openPrice : null;
  const isYesWinning = delta != null ? delta >= 0 : true;

  return (
    <div className="flex items-center gap-2.5">
      {/* Broadcast Countdown Clock */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-5 py-1 rounded-xl bg-[#18181b] border border-[#27272A] shadow-lg backdrop-blur-xl">
        <span
          className={cx(
            'font-["Epilogue"] text-[9px] sm:text-[10px] font-bold uppercase tracking-widest',
            isUrgent ? 'text-[#EF4444] animate-pulse' : 'text-[#c4c7c8]',
          )}
        >
          {phaseLabels[phase] || 'Trading Closes In'}
        </span>
        <span
          className={cx(
            'font-mono text-xl sm:text-3xl font-black tracking-widest tabular-nums leading-none mt-0.5',
            isUrgent ? 'text-[#EF4444]' : 'text-white',
          )}
        >
          {formatCountdown(remaining)}
        </span>
      </div>

      {/* Real-time Winning Price Indicator Beside Timer */}
      {livePrice != null && openPrice != null ? (
        <div
          className={cx(
            'hidden sm:flex flex-col items-start justify-center px-3.5 py-1.5 rounded-xl border shadow-lg backdrop-blur-xl transition-all duration-150',
            isYesWinning
              ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
              : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]',
          )}
        >
          <div className="flex items-center gap-1.5 font-['Epilogue'] text-[9px] font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full animate-pulse bg-current" />
            <span>{isYesWinning ? 'YES WINNING' : 'NO WINNING'}</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="font-mono text-base xl:text-lg font-black tracking-tight text-white">
              {formatPrice(livePrice)}
            </span>
            <span className="font-mono text-[11px] font-bold">
              {isYesWinning ? `+${delta!.toFixed(2)}` : delta!.toFixed(2)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChartFill({
  code,
  openPrice,
  livePrice,
}: {
  code: string;
  openPrice: number | null;
  livePrice: number | null;
}) {
  return (
    <div className="h-full w-full min-h-0">
      <CandleChart
        code={code}
        openPrice={openPrice}
        livePrice={livePrice}
        variant="display"
        candleLimit={120}
      />
    </div>
  );
}

function StatusLamp({ status, connected }: { status: string; connected: boolean }) {
  const live = status === 'LIVE';
  return (
    <div className="flex flex-col items-end gap-1 font-['Epilogue']">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider ${
          live
            ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
            : 'bg-[#201f1f] border border-[#27272A] text-[#c4c7c8]'
        }`}
      >
        {live ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
          </span>
        ) : null}
        {status === 'LOBBY' ? 'Open (Lobby)' : status}
      </div>
      {!connected ? (
        <span className="text-xs text-[#EAB308]">reconnecting…</span>
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm font-['Geist']">
      <div
        className={`rounded-2xl border-2 px-16 py-10 text-center backdrop-blur-xl ${
          isVoid
            ? 'border-[#EAB308] bg-[#EAB308]/15 shadow-2xl'
            : isYes
              ? 'border-[#22C55E] bg-[#22C55E]/15 shadow-2xl'
              : 'border-[#ef4444] bg-[#ef4444]/15 shadow-2xl'
        }`}
      >
        <div className="font-['Epilogue'] text-sm font-bold uppercase tracking-widest text-[#c4c7c8]">
          Round {settled.roundNumber} Result
        </div>
        <div
          className={`font-['Geist'] mt-3 text-7xl font-bold uppercase tracking-tight ${
            isVoid ? 'text-[#EAB308]' : isYes ? 'text-[#22C55E]' : 'text-[#ef4444]'
          }`}
        >
          {isVoid ? 'VOID' : isYes ? 'YES' : 'NO'}
        </div>
        <div className="mt-4 font-mono text-xl font-semibold text-white">
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
}: {
  status: string;
  code: string;
  name: string;
}) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (status === 'ENDED') {
    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#131313]/90 backdrop-blur-md">
        <div className="text-center font-['Geist']">
          <div className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-widest">{name}</div>
          <div className="font-['Geist'] mt-4 text-5xl font-bold text-white">
            Tournament Finished
          </div>
          <p className="mt-4 font-['Geist'] text-lg text-[#c4c7c8]">
            Final leaderboard and standings are displayed on screen.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'LOBBY' || status === 'DRAFT') {
    const joinUrl = origin ? `${origin}/arenas/${code}` : `/arenas/${code}`;

    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#131313]/90 backdrop-blur-md p-6 font-['Geist']">
        <div className="text-center flex flex-col items-center max-w-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-8 rounded-2xl bg-[rgba(20,20,20,0.9)] border border-[#27272A] p-8 text-white shadow-2xl backdrop-blur-xl">
            <div className="text-left flex flex-col justify-center">
              <div className="font-['Epilogue'] text-xs font-bold uppercase tracking-widest text-[#22C55E]">
                JOIN TOURNAMENT
              </div>
              <div className="font-mono mt-2 text-5xl font-bold tracking-widest text-white">
                {code}
              </div>
              <div className="mt-3 font-['Geist'] text-xs text-[#c4c7c8]">
                Scan QR or navigate to <span suppressHydrationWarning className="underline font-mono text-white">{origin || 'arenas'}</span>
              </div>
            </div>
            <div className="pointer-events-auto shrink-0 p-3 bg-white rounded-xl shadow-lg">
              <ArenaQRCodeCard code={code} joinUrl={joinUrl} size={160} showDownload={false} />
            </div>
          </div>

          <p className="mt-8 font-['Geist'] text-2xl font-semibold text-white">
            Waiting for Round 1 to start
          </p>
          <p className="mt-1 font-['Geist'] text-sm text-[#c4c7c8]">{name}</p>
        </div>
      </div>
    );
  }

  return null;
}
