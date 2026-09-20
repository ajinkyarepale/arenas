'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { ArenaQRCodeCard } from '@/components/arena/arena-share-modal';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { RoundTimer, roundPhase } from '@/components/arena/round-timer';
import { TradeTape } from '@/components/arena/trade-tape';
import { useArena } from '@/hooks/use-arena';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-[#201f1f]" /> },
);

/**
 * The projector view.
 *
 * Designed to be read from the back of an auditorium or lecture hall:
 * high contrast, no small fiddly controls, and the two numbers that matter —
 * the implied probability and the countdown — scaled to fill a wall.
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
  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);

  const priceUp =
    price?.price != null && round?.openPrice != null ? price.price >= round.openPrice : null;
  const isCustomMarket = info.marketCategory !== 'CRYPTO_PRICE';
  const customQuestion = round?.question || info.question;
  const delta =
    price?.price != null && round?.openPrice != null ? price.price - round.openPrice : null;

  return (
    <div className="scanlines relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#07080a] text-[#e5e2e1] font-['Geist'] p-4 xl:p-6 antialiased">
      {/* Ground plane + ambient bloom backdrop behind wall view */}
      <div className="grid-field pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div
        className="bloom pointer-events-none absolute left-1/2 top-0 h-[40rem] w-[70rem] -translate-x-1/2 -translate-y-1/4 opacity-60"
        aria-hidden
      />

      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between gap-6 border-b border-[#27272A]/80 pb-3 mb-2">
        {/* Left: Event & Join Code Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              {isCustomMarket ? 'CAMPUS PREDICTION ARENA' : 'BIG SCREEN PROJECTOR VIEW'}
            </div>
            {info.collegeName && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[13px]">school</span>
                <span>{info.collegeName}</span>
              </div>
            )}
          </div>
          <h1 className="font-['Geist'] text-2xl sm:text-3xl font-black tracking-tight text-white xl:text-4xl truncate">
            {info.name}
          </h1>
          <p className="mt-0.5 font-['Epilogue'] text-xs sm:text-sm text-[#a1a1aa]">
            {info.hostName ?? info.organizerName} · {isCustomMarket ? 'Custom Market' : info.asset} · Code:{' '}
            <span className="font-mono font-bold text-accent glow-accent tracking-wider text-base sm:text-lg">
              {info.code}
            </span>
          </p>
        </div>

        {/* Right: Round Counter & Status */}
        <div className="flex shrink-0 items-center justify-end gap-6">
          <div className="text-right">
            <div className="font-['Epilogue'] text-xs font-bold text-[#8e9192] uppercase tracking-wider">
              ROUND
            </div>
            <div className="font-display tnum text-3xl sm:text-5xl font-black text-white leading-none xl:text-6xl">
              {currentRound > 0 ? currentRound : '—'}
              <span className="text-[#71717a] text-xl xl:text-2xl font-normal"> / {info.totalRounds}</span>
            </div>
          </div>
          <StatusLamp status={status} connected={connected} />
        </div>
      </header>

      {/* Main Grid: Left Market Visuals (60%) | Right Hero Odds + Numbers (40%) */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 py-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-6">
        {/* Left Column: Live Chart + Probability Trace */}
        <section className="flex min-h-0 flex-col gap-4 overflow-hidden">
          {isCustomMarket ? (
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl flex min-h-0 flex-1 flex-col justify-between p-6 shadow-xl backdrop-blur-md">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#1c1c20] text-[#c4c7c8] border border-[#27272A] font-['Epilogue'] text-xs font-bold uppercase tracking-widest">
                    LIVE PREDICTION QUESTION
                  </span>
                  <span className="font-['Epilogue'] text-sm text-[#a1a1aa]">
                    Round {currentRound > 0 ? currentRound : 1} of {info.totalRounds}
                  </span>
                </div>

                <h2 className="font-['Geist'] text-2xl sm:text-4xl font-extrabold text-white leading-tight">
                  {customQuestion || info.name}
                </h2>

                {info.resolutionCriteria && (
                  <div className="p-4 bg-[#18181b] rounded-xl border border-[#27272a] text-sm text-[#a1a1aa] leading-relaxed">
                    <strong className="text-white">Resolution Criteria:</strong> {info.resolutionCriteria}
                  </div>
                )}
              </div>

              {/* Large Implied Probability Bar */}
              <div className="flex flex-col gap-3 pt-6 border-t border-[#27272a]">
                <div className="flex justify-between items-end font-['Epilogue']">
                  <div>
                    <span className="text-xs text-[#a1a1aa] uppercase font-bold block mb-1">YES ODDS</span>
                    <span className="font-display text-4xl sm:text-6xl font-extrabold text-[#22C55E] glow-yes">
                      {formatProbability(priceYes, 1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#a1a1aa] uppercase font-bold block mb-1">NO ODDS</span>
                    <span className="font-display text-4xl sm:text-6xl font-extrabold text-[#EF4444] glow-no">
                      {formatProbability(1 - priceYes, 1)}
                    </span>
                  </div>
                </div>
                <div className="h-5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                  <div
                    className="h-full bg-[#22C55E] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#121215] border border-[#27272A] rounded-2xl flex min-h-0 flex-[1.4] flex-col p-4 shadow-xl overflow-hidden backdrop-blur-md">
              {/* Header with Live delta and price */}
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 shrink-0 border-b border-[#27272A]/80 pb-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-['Epilogue'] text-sm font-bold text-white bg-[#1c1c20] px-2.5 py-1 rounded-md border border-[#27272A]">
                    {info.asset}
                  </span>
                  <span className="text-xs sm:text-sm text-[#8e9192] font-['Epilogue']">
                    Open: <strong className="text-white font-mono">{formatPrice(round?.openPrice)}</strong>
                  </span>
                  {delta != null && (
                    <span
                      className={cx(
                        'font-["Epilogue"] text-xs px-2.5 py-0.5 rounded-full font-bold',
                        priceUp
                          ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse'
                          : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 animate-pulse',
                      )}
                    >
                      {priceUp
                        ? `YES winning (+${delta.toFixed(2)})`
                        : `NO winning (-${Math.abs(delta).toFixed(2)})`}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 font-mono ml-auto">
                  <span className="text-xs text-[#71717a]">Live:</span>
                  <span
                    className={cx(
                      'text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight',
                      priceUp === true ? 'text-[#22C55E] glow-yes' : priceUp === false ? 'text-[#ef4444] glow-no' : 'text-white',
                    )}
                  >
                    {formatPrice(price?.price)}
                  </span>
                  {delta != null && (
                    <span
                      className={cx(
                        'text-xs font-bold font-mono px-1.5 py-0.5 rounded',
                        priceUp ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#EF4444] bg-[#EF4444]/10',
                      )}
                    >
                      {priceUp ? `+${delta.toFixed(2)}` : `${delta.toFixed(2)}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Chart Body with dynamic ResizeObserver scaling */}
              <div className="min-h-0 flex-1 rounded-xl overflow-hidden border border-[#27272A]/70 bg-[#09090b]">
                <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
              </div>
            </div>
          )}

          {/* Implied Probability Trend Bottom Card */}
          <div className="bg-[#121215] border border-[#27272A] rounded-2xl p-4 shadow-xl flex min-h-0 flex-1 flex-col justify-between gap-2 overflow-hidden backdrop-blur-md">
            <div className="flex items-center justify-between font-['Epilogue'] text-xs border-b border-[#27272A]/80 pb-1.5 shrink-0">
              <span className="font-bold text-[#c4c7c8] uppercase tracking-wider">
                Implied Probability Trend
              </span>
              <span className="text-[#8e9192] text-xs">
                {formatPoints(round?.volume ?? 0, 0)} pts volume · {round?.tradeCount ?? 0} trades
              </span>
            </div>

            {/* Probability Trace Curve */}
            <div className="min-h-0 flex-1 w-full overflow-hidden flex items-center">
              <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={90} />
            </div>

            {/* Compact Bottom split */}
            <div className="flex flex-col gap-1 shrink-0 pt-1 border-t border-[#27272A]/60">
              <div className="flex justify-between text-xs font-['Epilogue'] font-bold">
                <span className="text-[#22C55E]">YES {formatProbability(priceYes, 1)}</span>
                <span className="text-[#EF4444]">NO {formatProbability(1 - priceYes, 1)}</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272a]">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-300 rounded-full"
                  style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Hero Odds + Timer + Leaderboard */}
        <section className="flex min-h-0 flex-col gap-3.5 overflow-hidden">
          {/* Hero Chance Box - The massive focal number for the whole room */}
          <div className="relative overflow-hidden rounded-2xl border border-[#27272A] bg-[#121215] p-5 shadow-2xl backdrop-blur-md shrink-0">
            <div
              className="bloom pointer-events-none absolute inset-0 opacity-80"
              aria-hidden
            />
            <div className="relative">
              <div className="font-['Epilogue'] text-xs sm:text-sm font-bold uppercase tracking-[0.2em] text-[#8e9192]">
                Chance It Closes Up
              </div>
              <div
                className={cx(
                  'font-display tnum mt-1 text-mega font-black leading-none tracking-tight transition-colors',
                  priceYes >= 0.5 ? 'text-[#22C55E] glow-yes' : 'text-[#EF4444] glow-no',
                )}
              >
                {formatProbability(priceYes, 1)}
              </div>
              <div className="mt-4">
                <ProbabilityBar value={priceYes} variant="display" />
              </div>
            </div>
          </div>

          {/* Broadcast Round Timer */}
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] p-4 shadow-xl backdrop-blur-md shrink-0">
            <RoundTimer round={round} clockOffsetMs={clockOffsetMs} variant="display" />
          </div>

          {/* Live Order Tape */}
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] max-h-32 overflow-hidden p-3 shrink-0 shadow-md">
            <div className="mb-1.5 font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider flex items-center justify-between">
              <span>Live Order Stream</span>
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <TradeTape lastTrade={lastTrade} variant="display" />
          </div>

          {/* Tournament Leaderboard */}
          <div className="rounded-2xl border border-[#27272A] bg-[#121215] flex min-h-0 flex-1 flex-col p-4 shadow-xl backdrop-blur-md">
            <div className="mb-2.5 flex shrink-0 items-center justify-between font-['Epilogue'] text-xs border-b border-[#27272A]/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase tracking-wider text-xs">
                  TOURNAMENT STANDINGS
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold">
                  LIVE
                </span>
              </div>
              <span className="text-[#8e9192] font-mono text-xs">{leaderboard?.participantCount ?? 0} traders</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Leaderboard data={leaderboard} limit={10} variant="display" />
            </div>
          </div>
        </section>
      </main>

      {/* Settlement Flash Overlay */}
      {lastSettled ? <SettlementOverlay settled={lastSettled} /> : null}

      {/* Idle / Lobby Overlay */}
      {status !== 'LIVE' ? (
        <IdleOverlay status={status} code={info.code} name={info.name} />
      ) : null}
    </div>
  );
}

/** Measures its box dynamically and hands the chart an explicit pixel height */
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
    <div className="flex flex-col items-end gap-1 font-['Epilogue']">
      <div
        className={`flex items-center gap-2.5 px-4 py-2 rounded-full font-bold text-base uppercase tracking-wider ${
          live
            ? 'bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E]'
            : 'bg-[#201f1f] border border-[#27272A] text-[#c4c7c8]'
        }`}
      >
        {live ? (
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#22C55E] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[#22C55E]" />
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md font-['Geist'] animate-rise">
      <div
        className={`rounded-3xl border-2 px-20 py-12 text-center backdrop-blur-2xl ${
          isVoid
            ? 'border-[#EAB308] bg-[#EAB308]/15 shadow-[0_0_80px_rgba(234,179,8,0.4)]'
            : isYes
              ? 'border-[#22C55E] bg-[#22C55E]/15 shadow-[0_0_80px_rgba(34,197,94,0.4)]'
              : 'border-[#ef4444] bg-[#ef4444]/15 shadow-[0_0_80px_rgba(239,68,68,0.4)]'
        }`}
      >
        <div className="font-['Epilogue'] text-base font-bold uppercase tracking-widest text-[#c4c7c8]">
          Round {settled.roundNumber} Result
        </div>
        <div
          className={`font-display mt-4 text-7xl sm:text-8xl font-black uppercase tracking-tight ${
            isVoid ? 'text-[#EAB308]' : isYes ? 'text-[#22C55E] glow-yes' : 'text-[#ef4444] glow-no'
          }`}
        >
          {isVoid ? 'VOID' : isYes ? 'YES' : 'NO'}
        </div>
        <div className="mt-4 font-mono text-2xl font-semibold text-white">
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
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#07080a]/90 backdrop-blur-md">
        <div className="text-center font-['Geist']">
          <div className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-widest">{name}</div>
          <div className="font-display mt-4 text-5xl sm:text-6xl font-bold text-white">
            Tournament Finished
          </div>
          <p className="mt-4 font-['Geist'] text-xl text-[#c4c7c8]">
            Final leaderboard and standings are displayed on screen.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'LOBBY' || status === 'DRAFT') {
    const joinUrl = origin ? `${origin}/arenas/${code}` : `/arenas/${code}`;

    return (
      <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-[#07080a]/90 backdrop-blur-md p-6 font-['Geist']">
        <div className="text-center flex flex-col items-center max-w-3xl">
          {/*
            The join card inverts: an illuminated bright pane designed so people at the back
            of a 200-person lecture hall or auditorium can read it clearly.
          */}
          <div className="flex flex-col sm:flex-row items-center gap-8 rounded-3xl bg-[rgba(20,20,24,0.95)] border border-[#3f3f46] p-10 text-white shadow-[0_0_120px_rgba(61,155,255,0.35)] backdrop-blur-2xl">
            <div className="text-left flex flex-col justify-center">
              <div className="font-['Epilogue'] text-sm font-bold uppercase tracking-widest text-[#22C55E]">
                JOIN TOURNAMENT
              </div>
              <div className="font-mono mt-2 text-6xl sm:text-7xl font-black tracking-widest text-white">
                {code}
              </div>
              <div className="mt-4 font-['Geist'] text-sm text-[#c4c7c8]">
                Scan QR or navigate to <span suppressHydrationWarning className="underline font-mono text-white text-base">{origin || 'arenas'}</span>
              </div>
            </div>
            <div className="pointer-events-auto shrink-0 p-3 bg-white rounded-2xl shadow-2xl">
              <ArenaQRCodeCard code={code} joinUrl={joinUrl} size={180} showDownload={false} />
            </div>
          </div>

          <p className="mt-10 font-['Geist'] text-3xl font-bold text-white">
            Waiting for Round 1 to start
          </p>
          <p className="mt-2 font-['Geist'] text-lg text-[#c4c7c8]">{name}</p>
        </div>
      </div>
    );
  }

  return null;
}
