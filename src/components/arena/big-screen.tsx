'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Leaderboard } from '@/components/arena/leaderboard';
import { ArenaQRCodeCard } from '@/components/arena/arena-share-modal';
import { ProbabilityBar, ProbabilityTrace } from '@/components/arena/probability';
import { roundPhase } from '@/components/arena/round-timer';
import { TournamentAnalysis } from '@/components/arena/tournament-analysis';
import { useArena, useCountdown } from '@/hooks/use-arena';
import { cx, formatCountdown, formatPoints, formatPrice, formatProbability, formatSignedPoints } from '@/lib/format';
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
  const [showStandingsModal, setShowStandingsModal] = useState(false);
  const getOrigin = () => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return '';
  };

  const [origin, setOrigin] = useState(getOrigin);
  const [internalView, setInternalView] = useState<'screen' | 'live' | 'analysis'>('screen');
  const router = useRouter();

  const handleSelectView = (view: 'live' | 'screen' | 'analysis') => {
    if (onSelectView) {
      onSelectView(view);
    } else {
      if (view === 'live') {
        router.push(`/arenas/${code}/live`);
      } else {
        setInternalView(view);
      }
    }
  };

  useEffect(() => {
    setOrigin(getOrigin());
  }, []);

  if (internalView === 'analysis') {
    return <TournamentAnalysis initialArena={initialArena} onSelectView={handleSelectView} />;
  }

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
      <header className="relative grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[#27272A]/80 pb-3 mb-2.5 shrink-0">
        {/* Left: Tournament & Host Credentials + Round Badge */}
        <div className="min-w-0 flex items-center gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                {isCustomMarket ? 'CAMPUS ARENA' : 'BROADCAST'}
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/25 font-mono text-[10px] font-bold text-[#38BDF8] uppercase">
                {isCustomMarket ? 'Custom Market' : info.asset}
              </span>
              {info.collegeName && (
                <div className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#18181b] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase">
                  <span className="material-symbols-outlined text-[12px]">school</span>
                  <span className="truncate max-w-[120px]">{info.collegeName}</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-2.5">
              <h1 className="font-['Geist'] text-lg sm:text-xl xl:text-2xl font-black tracking-tight text-white truncate max-w-sm xl:max-w-md">
                {info.name}
              </h1>
              <span className="shrink-0 text-xs font-mono font-bold text-[#a1a1aa] bg-[#18181b] border border-[#27272A] px-2 py-0.5 rounded-md">
                Round {currentRound > 0 ? currentRound : 1} of {info.totalRounds}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Command Stadium Broadcast Timer */}
        <div className="shrink-0 flex items-center justify-center">
          <HeaderTimer
            round={round}
            clockOffsetMs={clockOffsetMs}
            isEnded={status === 'ENDED'}
          />
        </div>

        {/* Right: Join Beacon, Exit Link, and View Switcher Tabs */}
        <div className="flex shrink-0 items-center justify-end gap-2 xl:gap-2.5">
          {/* Exit Big Screen Button */}
          <Link
            href={`/arenas/${info.code}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#222228] border border-[#27272A] text-xs font-['Epilogue'] font-medium text-[#c4c7c8] hover:text-white transition-all cursor-pointer"
            title="Exit Big Screen View"
          >
            <span className="material-symbols-outlined text-[15px]">arrow_back</span>
            <span className="hidden sm:inline">Exit</span>
          </Link>

          {/* Join QR Beacon (Clickable for Room Attendees) */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#18181b] hover:bg-[#222228] border border-[#27272A] text-white shadow-lg transition-all cursor-pointer select-none"
            title="Click to view large join QR code"
          >
            <span className="text-[10px] text-[#22C55E] font-extrabold uppercase font-['Epilogue'] tracking-wider">
              JOIN
            </span>
            <span className="font-mono text-xs xl:text-sm font-black text-white tracking-widest">
              {info.code}
            </span>
            <span className="material-symbols-outlined text-[16px] text-[#22C55E]">qr_code_2</span>
          </button>

          {/* View Switcher Tabs (Always Visible) */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141418] border border-[#27272A]">
            <button
              type="button"
              onClick={() => handleSelectView('live')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#201f1f] transition-all cursor-pointer"
              title="Switch to Live Arena Terminal"
            >
              <span className="material-symbols-outlined text-[14px] text-[#22C55E]">bolt</span>
              <span className="hidden xl:inline">Live Arena</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-bold bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30 cursor-default"
            >
              <span className="material-symbols-outlined text-[14px]">tv</span>
              <span className="hidden xl:inline">Big Screen</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectView('analysis')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#201f1f] transition-all cursor-pointer"
              title="View Tournament Analysis"
            >
              <span className="material-symbols-outlined text-[14px] text-[#F59E0B]">analytics</span>
              <span className="hidden xl:inline">Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Broadcast Grid: Left Market Battle (76%) | Right Stage Podium Rail (24% / 320px) */}
      <main className="relative grid min-h-0 flex-1 grid-cols-1 gap-3 py-1 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-4">
        {/* Left Column: Unified Market Arena (76% width) */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#101014] border border-[#27272A] rounded-2xl shadow-2xl">
          {/* Top Arena HUD: Question & Target Metrics */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[#27272A]/80 px-4 py-2.5 xl:py-3 bg-[#131317]">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse shrink-0" />
              <h2 className="font-['Geist'] text-sm sm:text-base xl:text-lg font-black text-white truncate tracking-tight">
                {isCustomMarket
                  ? (customQuestion || info.name)
                  : `Will ${info.asset.replace('USDT', '')} close UP above the round's open strike?`}
              </h2>
            </div>

            {!isCustomMarket && (
              <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                {/* Target Strike */}
                <div className="flex items-baseline gap-1.5 px-3 py-1 rounded-lg bg-[#18181c] border border-[#27272A] text-xs">
                  <span className="font-['Epilogue'] text-[10px] font-bold text-[#8e9192] uppercase">STRIKE</span>
                  <span className="font-mono font-bold text-white">
                    {formatPrice(round?.openPrice)}
                  </span>
                </div>

                {/* Spot Price */}
                <div className="flex items-baseline gap-1.5 px-3 py-1 rounded-lg bg-[#18181c] border border-[#27272A] text-xs">
                  <span className="font-['Epilogue'] text-[10px] font-bold text-[#8e9192] uppercase">SPOT</span>
                  <span
                    className={cx(
                      'font-mono font-black',
                      priceUp === true ? 'text-[#22C55E]' : priceUp === false ? 'text-[#EF4444]' : 'text-white',
                    )}
                  >
                    {formatPrice(price?.price)}
                  </span>
                </div>

                {/* Real-time Verdict */}
                <div
                  className={cx(
                    'px-3 py-1 rounded-lg font-mono text-xs font-black border transition-colors',
                    priceUp
                      ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                      : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]',
                  )}
                >
                  {priceUp
                    ? `YES WINNING (+${delta?.toFixed(2)})`
                    : `NO WINNING (-${Math.abs(delta ?? 0).toFixed(2)})`}
                </div>
              </div>
            )}
          </div>

          {/* Full-Height High-Res Chart Canvas */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0a0a0d]">
            <ChartFill code={code} openPrice={round?.openPrice ?? null} livePrice={price?.price ?? null} />
          </div>

          {/* Integrated Crowd Odds Sentiment Bar */}
          <div className="flex shrink-0 flex-col gap-1.5 border-t border-[#27272A]/80 px-4 py-2.5 bg-[#131317]">
            <div className="flex items-center justify-between font-['Epilogue'] text-xs">
              <div className="flex items-baseline gap-2 font-mono">
                <span className="font-['Epilogue'] text-[11px] font-black text-[#22C55E] uppercase tracking-wider">
                  YES ODDS
                </span>
                <span className="text-base sm:text-lg font-black text-[#22C55E]">
                  {formatProbability(priceYes, 1)}
                </span>
                <span className="text-xs text-[#a1a1aa] font-mono">
                  ({(priceYes).toFixed(2)} arcs)
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-[#a1a1aa] font-mono text-xs">
                <span>{formatPoints(round?.volume ?? 0, 0)} arcs volume</span>
                <span>·</span>
                <span>{round?.tradeCount ?? 0} predictions</span>
              </div>

              <div className="flex items-baseline gap-2 font-mono text-right">
                <span className="text-xs text-[#a1a1aa] font-mono">
                  ({(1 - priceYes).toFixed(2)} arcs)
                </span>
                <span className="text-base sm:text-lg font-black text-[#EF4444]">
                  {formatProbability(1 - priceYes, 1)}
                </span>
                <span className="font-['Epilogue'] text-[11px] font-black text-[#EF4444] uppercase tracking-wider">
                  NO ODDS
                </span>
              </div>
            </div>

            {/* Stadium Dual-Color Probability Bar */}
            <div className="h-3 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex p-0.5 border border-[#27272A]">
              <div
                className="h-full bg-[#22C55E] transition-all duration-200 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                style={{ width: `${Math.min(98, Math.max(2, priceYes * 100))}%` }}
              />
            </div>
          </div>
        </section>

        {/* Right Column: Stage Podium Rail (24% / 320px) */}
        <StagePodiumRail
          leaderboard={leaderboard}
          currentRound={currentRound}
          totalRounds={info.totalRounds}
          volume={round?.volume ?? 0}
          onOpenStandings={() => setShowStandingsModal(true)}
        />
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

      {/* Pop-up Full Standings Modal if triggered from Rail */}
      {showStandingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          onClick={() => setShowStandingsModal(false)}
        >
          <div
            className="flex flex-col rounded-2xl bg-[#141417] border border-[#3f3f46] p-6 text-white shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#22C55E]">leaderboard</span>
                <span className="font-['Geist'] text-base font-black text-white">Full Tournament Standings</span>
              </div>
              <button
                type="button"
                onClick={() => setShowStandingsModal(false)}
                className="text-xs text-[#a1a1aa] hover:text-white px-2.5 py-1 rounded bg-[#27272A] hover:bg-[#3f3f46] transition-colors"
              >
                Close (ESC)
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <Leaderboard data={leaderboard} limit={50} variant="display" />
            </div>
          </div>
        </div>
      )}

      {/* Settlement Flash */}
      {lastSettled ? <SettlementOverlay settled={lastSettled} /> : null}

      {status !== 'LIVE' ? (
        <IdleOverlay
          status={status}
          code={info.code}
          name={info.name}
          onSelectView={handleSelectView}
        />
      ) : null}
    </div>
  );
}

function HeaderTimer({
  round,
  clockOffsetMs,
  isEnded,
}: {
  round: any;
  clockOffsetMs: number;
  isEnded?: boolean;
}) {
  const now = Date.now() + clockOffsetMs;
  const phase = roundPhase(round, now);
  const target = isEnded
    ? null
    : phase === 'resolved'
      ? (round?.settledAt
          ? new Date(new Date(round.settledAt).getTime() + 30_000).toISOString()
          : null)
      : phase === 'locked'
        ? (round?.resolvesAt ?? null)
        : (round?.locksAt ?? null);
  const remaining = useCountdown(target, clockOffsetMs);

  if (isEnded) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-2 rounded-2xl border border-[#27272A] bg-[#141418] shadow-xl">
        <span className="font-['Epilogue'] text-[10px] font-black uppercase tracking-widest text-[#22C55E]">
          STAGE COMPLETE
        </span>
        <span className="font-mono text-lg sm:text-xl xl:text-2xl font-black tracking-tight text-white mt-0.5">
          CONCLUDED
        </span>
      </div>
    );
  }

  const phaseLabels: Record<string, string> = {
    waiting: 'Next round in',
    trading: 'Trading locks in',
    closing: 'Closing soon',
    locked: 'Settling outcome',
    resolved: 'Round resolved',
  };

  const isUrgent = phase === 'closing' || phase === 'locked' || (remaining != null && remaining <= 30_000);

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
        {phase === 'resolved'
          ? 'RESOLVED'
          : phase === 'locked' && (remaining == null || remaining <= 0)
            ? 'SETTLING...'
            : formatCountdown(remaining)}
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

function StagePodiumRail({
  leaderboard,
  currentRound,
  totalRounds,
  volume,
  onOpenStandings,
}: {
  leaderboard: any;
  currentRound: number;
  totalRounds: number;
  volume: number;
  onOpenStandings: () => void;
}) {
  const entries = leaderboard?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const runnersUp = entries.slice(3, 6);
  const hasTraders = entries.length > 0;

  return (
    <aside className="bg-[#101014] border border-[#27272A] rounded-2xl flex min-h-0 flex-col p-3.5 xl:p-4 shadow-2xl justify-between overflow-hidden">
      {/* Rail Header */}
      <div>
        <div className="flex shrink-0 items-center justify-between font-['Epilogue'] border-b border-[#27272A]/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#EAB308] animate-pulse" />
            <span className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">
              STAGE PODIUM
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#27272A] text-[#a1a1aa] font-mono text-[10px] font-bold">
            {leaderboard?.participantCount ?? entries.length} TRADERS
          </span>
        </div>

        {/* Podium Content */}
        {!hasTraders ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#27272A] p-6 text-center text-[#71717a] gap-2">
            <span className="material-symbols-outlined text-2xl text-[#a1a1aa]">military_tech</span>
            <p className="text-xs font-semibold text-white">Podium Awaiting Predictions</p>
            <p className="text-[10px]">Leaderboard updates as round trades resolve.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {/* Top 3 Cards */}
            {top3.map((entry: any, index: number) => {
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;

              return (
                <div
                  key={entry.participantId}
                  className={cx(
                    'flex items-center justify-between rounded-xl border px-3 py-2 xl:py-2.5 transition-all select-none',
                    isFirst && 'border-[#EAB308]/60 bg-gradient-to-r from-[#EAB308]/20 via-[#EAB308]/5 to-[#16161a] shadow-[0_0_20px_-6px_rgba(234,179,8,0.35)]',
                    isSecond && 'border-[#E2E8F0]/40 bg-gradient-to-r from-[#E2E8F0]/15 via-[#E2E8F0]/5 to-[#16161a]',
                    isThird && 'border-[#CD7F32]/40 bg-gradient-to-r from-[#CD7F32]/15 via-[#CD7F32]/5 to-[#16161a]',
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                    <div
                      className={cx(
                        'flex shrink-0 items-center justify-center rounded-lg font-black border font-mono text-xs w-7 h-7 tracking-tight',
                        isFirst && 'bg-[#EAB308]/25 border-[#EAB308]/80 text-[#EAB308] shadow-[0_0_10px_rgba(234,179,8,0.5)]',
                        isSecond && 'bg-[#E2E8F0]/20 border-[#E2E8F0]/60 text-[#E2E8F0]',
                        isThird && 'bg-[#CD7F32]/25 border-[#CD7F32]/70 text-[#FFA07A]',
                      )}
                    >
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <span
                      className="truncate font-['Geist'] text-xs xl:text-sm font-bold text-white tracking-tight"
                      title={entry.displayName}
                    >
                      {entry.displayName}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 shrink-0 text-right">
                    {entry.lastRoundPnl !== 0 && (
                      <span
                        className={cx(
                          'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border',
                          entry.lastRoundPnl > 0
                            ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                            : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]',
                        )}
                      >
                        {formatSignedPoints(entry.lastRoundPnl, 0)}
                      </span>
                    )}
                    <span className="font-mono text-xs xl:text-sm font-black text-white">
                      {formatPoints(entry.balance, 0)}
                    </span>
                    <span className="text-[10px] text-[#71717a] font-mono">arcs</span>
                  </div>
                </div>
              );
            })}

            {/* Runners Up Micro Rows */}
            {runnersUp.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 pt-2 border-t border-[#27272A]/60">
                <span className="text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider text-[#71717a] px-1">
                  Runners Up
                </span>
                {runnersUp.map((entry: any, i: number) => (
                  <div
                    key={entry.participantId}
                    className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-[#141417] border border-[#27272A]/50 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate min-w-0 flex-1 mr-2">
                      <span className="font-mono text-[10px] font-bold text-[#71717a]">
                        #{String(i + 4).padStart(2, '0')}
                      </span>
                      <span className="truncate font-medium text-white text-[11px]">
                        {entry.displayName}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold text-[#c4c7c8] shrink-0">
                      {formatPoints(entry.balance, 0)} arcs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rail Footer */}
      <div className="pt-3 border-t border-[#27272A]/80 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
          <span>Round {currentRound > 0 ? currentRound : 1} of {totalRounds}</span>
          <span>Volume: <strong className="text-white">{formatPoints(volume, 0)} arcs</strong></span>
        </div>

        {entries.length > 3 && (
          <button
            type="button"
            onClick={onOpenStandings}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px]">leaderboard</span>
            View Full Standings ({entries.length})
          </button>
        )}
      </div>
    </aside>
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
  onSelectView,
}: {
  status: string;
  code: string;
  name: string;
  onSelectView?: (view: 'live' | 'screen' | 'analysis') => void;
}) {
  const [origin, setOrigin] = useState(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envUrl) return envUrl.replace(/\/$/, '');
    if (typeof window !== 'undefined' && window.location.origin) return window.location.origin;
    return '';
  });
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
    if (envUrl) {
      setOrigin(envUrl.replace(/\/$/, ''));
    } else if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  if (status === 'ENDED') {
    if (dismissed) {
      return (
        <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-[#141418]/95 border border-[#27272A] p-2 rounded-xl shadow-2xl backdrop-blur-xl">
          <span className="font-['Epilogue'] text-xs font-bold text-[#a1a1aa] pl-2">Tournament Ended</span>
          <button
            type="button"
            onClick={() => onSelectView?.('analysis')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/40 font-['Epilogue'] text-xs font-bold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">analytics</span>
            View Analysis
          </button>
          <button
            type="button"
            onClick={() => setDismissed(false)}
            className="px-2 py-1 text-xs text-[#71717a] hover:text-white"
            title="Expand overlay"
          >
            Expand
          </button>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#131313]/90 backdrop-blur-md p-6">
        <div className="text-center font-['Geist'] flex flex-col items-center max-w-md">
          <div className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase tracking-widest">{name}</div>
          <div className="font-['Geist'] mt-2 text-2xl sm:text-3xl font-extrabold text-white">
            Tournament Finished
          </div>
          <p className="mt-2 font-['Geist'] text-sm text-[#a1a1aa]">
            Final leaderboard and standings are displayed on screen.
          </p>

          {/* Action Buttons to View Analysis or Final Board */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onSelectView?.('analysis')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#22C55E] hover:bg-[#16a34a] text-black font-['Epilogue'] text-xs font-bold shadow-[0_0_20px_rgba(34,197,94,0.35)] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">analytics</span>
              View Tournament Analysis
            </button>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-white font-['Epilogue'] text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-[#a1a1aa]">visibility</span>
              Inspect Standings
            </button>
          </div>
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
