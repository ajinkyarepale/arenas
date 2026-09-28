'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { ArenaQRCodeCard } from '@/components/arena/arena-share-modal';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { roundPhase } from '@/components/arena/round-timer';
import { useArena, useCountdown } from '@/hooks/use-arena';
import { cx, formatCountdown, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-[#201f1f]" /> },
);

export function BigScreen({
  initialArena,
  onSelectView,
}: {
  initialArena: ArenaPublicInfo;
  onSelectView?: (view: 'live' | 'screen' | 'analysis') => void;
}) {
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

  const [showQrModal, setShowQrModal] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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

  const joinUrl = origin ? `${origin}/arenas/${info.code}` : `/arenas/${info.code}`;

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#070709] text-[#e5e2e1] font-['Geist'] p-3.5 xl:p-5 antialiased select-none">
      {/* Broadcast Header */}
      <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-[#27272A]/80 pb-3 mb-2.5">
        {/* Left: Tournament & Host Credentials */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-widest uppercase">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              {isCustomMarket ? 'CAMPUS PREDICTION ARENA' : 'BIG SCREEN BROADCAST'}
            </div>
            {info.collegeName && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider">
                <span className="material-symbols-outlined text-[13px]">school</span>
                <span>{info.collegeName}</span>
              </div>
            )}
          </div>
          <h1 className="font-['Geist'] text-xl sm:text-2xl xl:text-3xl font-black tracking-tight text-white truncate">
            {info.name}
          </h1>
          <p className="mt-0.5 font-['Epilogue'] text-xs text-[#a1a1aa]">
            {info.hostName ?? info.organizerName} · {isCustomMarket ? 'Custom Market' : info.asset}
          </p>
        </div>

        {/* Center: Command Stadium Broadcast Timer */}
        <div className="shrink-0 flex items-center justify-center">
          <HeaderTimer
            round={round}
            clockOffsetMs={clockOffsetMs}
          />
        </div>

        {/* Right: Round Counter, Join Beacon, and Live Lamp */}
        <div className="flex shrink-0 items-center justify-end gap-4 xl:gap-6 flex-1">
          <div className="text-right">
            <div className="font-['Epilogue'] text-[11px] font-bold text-[#8e9192] uppercase tracking-wider">ROUND</div>
            <div className="font-['Epilogue'] text-2xl xl:text-3xl font-black text-white leading-none">
              {currentRound > 0 ? currentRound : '—'}
              <span className="text-[#71717a] text-sm xl:text-base font-normal"> / {info.totalRounds}</span>
            </div>
          </div>

          {/* Join QR Beacon (Clickable for Room Attendees) */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#222228] border border-[#27272A] text-white shadow-lg transition-all cursor-pointer"
            title="Click to view large join QR code"
          >
            <div className="text-left font-['Epilogue']">
              <span className="text-[10px] text-[#22C55E] font-extrabold uppercase tracking-wider block">
                SCAN TO JOIN
              </span>
              <span className="font-mono text-sm xl:text-base font-black text-white tracking-wider">
                {info.code}
              </span>
            </div>
            <span className="material-symbols-outlined text-[22px] text-[#22C55E]">qr_code_2</span>
          </button>

          <StatusLamp status={status} connected={connected} />

          {/* View Switcher Tabs */}
          {onSelectView && (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141418] border border-[#27272A]">
              <button
                type="button"
                onClick={() => onSelectView('live')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-['Epilogue'] font-bold text-[#a1a1aa] hover:text-white hover:bg-[#201f1f] transition-all cursor-pointer"
                title="Switch to Live Arena Terminal"
              >
                <span className="material-symbols-outlined text-[15px] text-[#22C55E]">bolt</span>
                <span className="hidden xl:inline">Live Arena</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-['Epilogue'] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 shadow-sm cursor-default"
              >
                <span className="material-symbols-outlined text-[15px]">tv</span>
                <span className="hidden xl:inline">Big Screen</span>
              </button>
              <button
                type="button"
                onClick={() => onSelectView('analysis')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-['Epilogue'] font-bold text-[#a1a1aa] hover:text-white hover:bg-[#201f1f] transition-all cursor-pointer"
                title="View Tournament Analysis"
              >
                <span className="material-symbols-outlined text-[15px] text-[#F59E0B]">analytics</span>
                <span className="hidden xl:inline">Analysis</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Broadcast Grid: Left Market Battle (62%) | Right Stage Leaderboard (38%) */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-3.5 py-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:gap-4">
        {/* Left Column: Battle Hero + Chart + Implied Probability Duel */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          {/* Battle Hero Card */}
          <div className="bg-[#101014] border border-[#27272A] rounded-2xl p-3.5 xl:p-4 shadow-xl flex flex-col gap-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-[#a1a1aa] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                ROUND QUESTION & TARGET
              </span>
              <span className="font-['Epilogue'] text-xs font-semibold text-[#71717a]">
                Settles on 1m TWAP at 0:00
              </span>
            </div>

            <h2 className="font-['Geist'] text-lg sm:text-xl xl:text-2xl font-black text-white leading-tight">
              {isCustomMarket
                ? (customQuestion || info.name)
                : `Will ${info.asset.replace('USDT', '')} close UP above the round's open strike?`}
            </h2>

            {!isCustomMarket && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Strike / Open Card */}
                <div className="bg-[#16161a] border border-[#27272A] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TARGET STRIKE (OPEN)
                  </span>
                  <span className="font-mono text-lg xl:text-xl font-black text-white mt-0.5">
                    {formatPrice(round?.openPrice)}
                  </span>
                </div>

                {/* Live Spot Price Card */}
                <div className="bg-[#16161a] border border-[#27272A] rounded-xl px-3.5 py-2 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    LIVE BINANCE SPOT
                  </span>
                  <span
                    className={cx(
                      'font-mono text-lg xl:text-xl font-black mt-0.5 flex items-baseline gap-2',
                      priceUp === true ? 'text-[#22C55E]' : priceUp === false ? 'text-[#EF4444]' : 'text-white',
                    )}
                  >
                    {formatPrice(price?.price)}
                  </span>
                </div>

                {/* Real-time Verdict */}
                <div
                  className={cx(
                    'border rounded-xl px-3.5 py-2 flex flex-col justify-center transition-colors',
                    priceUp
                      ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                      : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]',
                  )}
                >
                  <span className="font-['Epilogue'] text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                    LIVE VERDICT
                  </span>
                  <span className="font-mono text-base xl:text-lg font-black mt-0.5 tracking-tight truncate">
                    {priceUp
                      ? `YES WINNING (+${delta?.toFixed(2)})`
                      : `NO WINNING (-${Math.abs(delta ?? 0).toFixed(2)})`}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Clean Streamlined Chart Body */}
          <div className="bg-[#101014] border border-[#27272A] rounded-2xl flex min-h-0 flex-1 flex-col overflow-hidden shadow-xl">
            <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
          </div>

          {/* Crowd Odds Implied Probability Duel */}
          <div className="bg-[#101014] border border-[#27272A] rounded-2xl p-3.5 xl:p-4 shadow-xl flex flex-col gap-2 shrink-0">
            <div className="flex items-center justify-between font-['Epilogue'] text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                CROWD PREDICTION ODDS (MARKET SENTIMENT)
              </span>
              <span className="text-[#a1a1aa] font-mono text-xs">
                {formatPoints(round?.volume ?? 0, 0)} pts volume · {round?.tradeCount ?? 0} predictions
              </span>
            </div>

            {/* Duel Percentages */}
            <div className="flex justify-between items-baseline font-mono px-1">
              <div className="flex items-baseline gap-2">
                <span className="font-['Epilogue'] text-xs font-black text-[#22C55E] uppercase tracking-wider">
                  YES ODDS
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#22C55E]">
                  {formatProbability(priceYes, 1)}
                </span>
                <span className="text-xs text-[#a1a1aa] font-mono">
                  ({(priceYes * 100).toFixed(1)}¢)
                </span>
              </div>

              <div className="flex items-baseline gap-2 text-right">
                <span className="text-xs text-[#a1a1aa] font-mono">
                  ({((1 - priceYes) * 100).toFixed(1)}¢)
                </span>
                <span className="text-xl sm:text-2xl font-black text-[#EF4444]">
                  {formatProbability(1 - priceYes, 1)}
                </span>
                <span className="font-['Epilogue'] text-xs font-black text-[#EF4444] uppercase tracking-wider">
                  NO ODDS
                </span>
              </div>
            </div>

            {/* Stadium Dual-Color Probability Bar */}
            <div className="h-5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272A]">
              <div
                className="h-full bg-[#22C55E] transition-all duration-200 rounded-full shadow-[0_0_12px_rgba(34,197,94,0.5)]"
                style={{ width: `${Math.min(98, Math.max(2, priceYes * 100))}%` }}
              />
            </div>
          </div>
        </section>

        {/* Right Column: Tournament Stage Leaderboard (Top 10) */}
        <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
          <div className="bg-[#101014] border border-[#27272A] rounded-2xl flex min-h-0 flex-1 flex-col p-4 shadow-xl">
            <div className="mb-3 flex shrink-0 items-center justify-between font-['Epilogue'] border-b border-[#27272A]/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-black text-white uppercase tracking-wider text-sm">
                  STAGE LEADERBOARD
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-[11px] font-bold">
                  TOP 10 LIVE
                </span>
              </div>
              <span className="text-[#a1a1aa] font-mono text-xs font-bold">
                {leaderboard?.participantCount ?? 0} ACTIVE TRADERS
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Leaderboard data={leaderboard} limit={10} variant="display" />
            </div>

            {/* Stage Telemetry Footer */}
            <div className="mt-3 pt-2.5 border-t border-[#27272A]/80 flex items-center justify-between text-xs font-mono text-[#a1a1aa] shrink-0">
              <span>Round {currentRound > 0 ? currentRound : 1} of {info.totalRounds}</span>
              <span>Total Volume: <strong className="text-white">{formatPoints(round?.volume ?? 0, 0)} pts</strong></span>
            </div>
          </div>
        </section>
      </main>

      {/* Pop-up Join QR Code Modal for Latecomers in the Room */}
      {showQrModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="flex flex-col sm:flex-row items-center gap-8 rounded-2xl bg-[#141417] border border-[#3f3f46] p-8 text-white shadow-2xl max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-left flex flex-col justify-center flex-1">
              <div className="font-['Epilogue'] text-xs font-bold uppercase tracking-widest text-[#22C55E]">
                JOIN TOURNAMENT
              </div>
              <div className="font-mono mt-1 text-5xl font-black tracking-widest text-white">
                {info.code}
              </div>
              <p className="mt-3 text-xs text-[#a1a1aa] leading-relaxed">
                Scan the QR code with your phone camera or navigate to the URL below:
              </p>
              <div className="mt-3 p-2 bg-[#09090b] rounded-lg border border-[#27272A] font-mono text-xs text-[#22C55E] select-all truncate">
                {joinUrl}
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="mt-6 px-4 py-2 bg-[#27272A] hover:bg-[#3f3f46] text-white rounded-lg text-xs font-bold self-start transition-colors"
              >
                Close (ESC)
              </button>
            </div>
            <div className="shrink-0 p-3 bg-white rounded-xl shadow-lg">
              <ArenaQRCodeCard code={info.code} joinUrl={joinUrl} size={180} showDownload={false} />
            </div>
          </div>
        </div>
      )}

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
}: {
  round: any;
  clockOffsetMs: number;
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

  const isUrgent = phase === 'closing' || phase === 'locked' || (remaining != null && remaining <= 30);

  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center px-8 py-2 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all duration-300',
        isUrgent
          ? 'bg-[#EF4444]/15 border-[#EF4444]/60 shadow-[0_0_30px_rgba(239,68,68,0.35)]'
          : 'bg-[#141418] border-[#27272A]',
      )}
    >
      <span
        className={cx(
          'font-["Epilogue"] text-[10px] sm:text-xs font-black uppercase tracking-widest',
          isUrgent ? 'text-[#EF4444] animate-pulse' : 'text-[#a1a1aa]',
        )}
      >
        {phaseLabels[phase] || 'Trading Closes In'}
      </span>
      <span
        className={cx(
          'font-mono text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight tabular-nums leading-none mt-1',
          isUrgent ? 'text-[#EF4444]' : 'text-white',
        )}
      >
        {phase === 'resolved' ? '--:--' : formatCountdown(remaining)}
      </span>
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
