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

  const isCustomMarket = info.marketCategory !== 'CRYPTO_PRICE';
  const customQuestion = round?.question || info.question;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#131313] text-[#e5e2e1] font-['Geist'] p-4 xl:p-6 antialiased">
      {/* Header */}
      <header className="relative flex shrink-0 items-center justify-between gap-6 border-b border-[#27272A] pb-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-widest uppercase">
              {isCustomMarket ? 'CAMPUS PREDICTION ARENA' : 'BIG SCREEN PROJECTOR VIEW'}
            </div>
            {info.collegeName && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[13px]">school</span>
                <span>{info.collegeName}</span>
              </div>
            )}
          </div>
          <h1 className="font-['Geist'] truncate text-3xl font-bold tracking-tight text-white xl:text-5xl">
            {info.name}
          </h1>
          <p className="mt-1 font-['Epilogue'] text-base text-[#c4c7c8] xl:text-xl">
            {info.hostName ?? info.organizerName} · {isCustomMarket ? 'Custom Market' : info.asset} · Join Code:{' '}
            <span className="font-mono font-bold text-[#22C55E] tracking-wider">{info.code}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-8">
          <div className="text-right">
            <div className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider">ROUND</div>
            <div className="font-['Epilogue'] text-4xl font-bold text-white leading-none xl:text-6xl">
              {currentRound > 0 ? currentRound : '—'}
              <span className="text-[#8e9192]"> / {info.totalRounds}</span>
            </div>
          </div>
          <StatusLamp status={status} connected={connected} />
        </div>
      </header>

      {/* Main Grid */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-4 py-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-6">
        {/* Chart / Question Spotlight Column */}
        <section className="flex min-h-0 flex-col gap-4">
          {isCustomMarket ? (
            <div className="bg-[rgba(20,20,20,0.85)] border border-[#27272A] backdrop-blur-xl rounded-xl flex min-h-0 flex-1 flex-col justify-between p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#201f1f] text-[#c4c7c8] border border-[#27272A] font-['Epilogue'] text-xs font-bold uppercase tracking-widest">
                    LIVE PREDICTION QUESTION
                  </span>
                  <span className="font-['Epilogue'] text-sm text-[#a1a1aa]">
                    Round {currentRound > 0 ? currentRound : 1} of {info.totalRounds}
                  </span>
                </div>

                <h2 className="font-['Geist'] text-2xl sm:text-4xl font-extrabold text-white leading-tight mt-2">
                  {customQuestion || info.name}
                </h2>

                {info.resolutionCriteria && (
                  <div className="p-4 bg-[#18181b] rounded-xl border border-[#27272a] text-sm text-[#a1a1aa] mt-2">
                    <strong className="text-white">Resolution Criteria:</strong> {info.resolutionCriteria}
                  </div>
                )}
              </div>

              {/* Large Implied Probability Bar */}
              <div className="flex flex-col gap-3 pt-6 border-t border-[#27272a]">
                <div className="flex justify-between items-end font-['Epilogue']">
                  <div>
                    <span className="text-xs text-[#a1a1aa] uppercase font-bold block mb-1">YES ODDS</span>
                    <span className="font-['Geist'] text-3xl sm:text-5xl font-extrabold text-[#22C55E]">
                      {formatProbability(priceYes, 1)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#a1a1aa] uppercase font-bold block mb-1">NO ODDS</span>
                    <span className="font-['Geist'] text-3xl sm:text-5xl font-extrabold text-[#EF4444]">
                      {formatProbability(1 - priceYes, 1)}
                    </span>
                  </div>
                </div>
                <div className="h-6 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-1 border border-[#27272a]">
                  <div
                    className="h-full bg-[#22C55E] transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(5, Math.min(95, priceYes * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl flex min-h-0 flex-1 flex-col p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="font-['Epilogue'] text-xs font-bold text-white bg-[#201f1f] px-2.5 py-1 rounded border border-[#27272A]">
                  {info.asset}
                </span>
                <div className="flex items-baseline gap-5 font-['Epilogue']">
                  <span className="text-sm text-[#c4c7c8]">
                    Open:{' '}
                    <span className="font-semibold text-white font-mono">
                      {formatPrice(round?.openPrice)}
                    </span>
                  </span>
                  <span
                    className={cx(
                      'font-mono text-3xl font-bold xl:text-4xl',
                      priceUp === true ? 'text-[#22C55E]' : priceUp === false ? 'text-[#ef4444]' : 'text-white',
                    )}
                  >
                    {formatPrice(price?.price)}
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 rounded-lg overflow-hidden border border-[#27272A] bg-[#141414]">
                <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
              </div>
            </div>
          )}

          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl shrink-0 p-4">
            <div className="mb-2 flex items-center justify-between font-['Epilogue'] text-xs">
              <span className="font-bold text-[#c4c7c8] uppercase tracking-wider">
                Implied Probability This Round
              </span>
              <span className="text-[#8e9192]">
                {formatPoints(round?.volume ?? 0, 0)} pts traded · {round?.tradeCount ?? 0} trades
              </span>
            </div>
            <ProbabilityTrace value={priceYes} roundId={round?.id ?? null} height={90} />
          </div>
        </section>

        {/* Numbers + Leaderboard Column */}
        <section className="flex min-h-0 flex-col gap-4">
          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-5 flex flex-col gap-2">
            <div className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider">
              Chance It Closes UP (YES)
            </div>
            {round && (round.tradeCount > 0 || round.qYes > 0 || round.qNo > 0) ? (
              <>
                <div
                  className={`font-['Geist'] text-5xl font-bold tracking-tight ${
                    priceYes >= 0.5 ? 'text-[#22C55E]' : 'text-[#ef4444]'
                  }`}
                >
                  {formatProbability(priceYes, 1)}
                </div>
                <div className="mt-2">
                  <ProbabilityBar value={priceYes} variant="display" />
                </div>
              </>
            ) : (
              <>
                <div className="font-['Geist'] text-3xl font-bold text-[#8e9192]">
                  No predictions yet
                </div>
                <div className="mt-2">
                  <ProbabilityBar value={null} tradeCount={0} variant="display" />
                </div>
              </>
            )}
          </div>

          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl p-5">
            <RoundTimer round={round} clockOffsetMs={clockOffsetMs} variant="display" />
          </div>

          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl max-h-36 overflow-hidden p-4">
            <div className="mb-2 font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider">
              Live Order Tape
            </div>
            <TradeTape lastTrade={lastTrade} variant="display" />
          </div>

          <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] backdrop-blur-xl rounded-xl flex min-h-0 flex-1 flex-col p-5">
            <div className="mb-3 flex shrink-0 items-center justify-between font-['Epilogue'] text-xs">
              <span className="font-bold text-[#c4c7c8] uppercase tracking-wider">Leaderboard</span>
              <span className="text-[#8e9192]">{leaderboard?.participantCount ?? 0} traders</span>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <Leaderboard data={leaderboard} limit={10} variant="display" />
            </div>
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
