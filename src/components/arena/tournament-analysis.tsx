'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import type { TournamentAnalysisPayload, RoundAnalysisItem } from '@/app/api/arenas/[code]/analysis/route';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

interface TournamentAnalysisProps {
  initialArena: ArenaPublicInfo;
  onSelectView?: (view: 'live' | 'screen' | 'analysis') => void;
  onBack?: () => void;
  hideHeader?: boolean;
}

export function TournamentAnalysis({ initialArena, onSelectView, onBack, hideHeader }: TournamentAnalysisProps) {
  const code = initialArena.code;
  const [data, setData] = useState<TournamentAnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});

  const fetchAnalysis = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/analysis`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to load tournament analysis data');
      }
      const json: TournamentAnalysisPayload = await res.json();
      setData(json);

      // Default expand all resolved rounds or latest round on first load
      setExpandedRounds((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const initialExpanded: Record<number, boolean> = {};
        json.rounds.forEach((r, idx) => {
          if (r.status === 'TRADING' || r.status === 'LOCKED' || idx >= json.rounds.length - 2 || idx === 0) {
            initialExpanded[r.roundNumber] = true;
          }
        });
        return initialExpanded;
      });
    } catch (err: any) {
      if (!isBackground) setError(err?.message || 'Error loading analysis');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchAnalysis(false);
    // Auto-poll every 5 seconds if tournament is actively LIVE
    const isLive = initialArena.status === 'LIVE' || data?.arena?.status === 'LIVE';
    if (isLive) {
      const interval = setInterval(() => {
        void fetchAnalysis(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [fetchAnalysis, initialArena.status, data?.arena?.status]);

  const toggleRound = (roundNumber: number) => {
    setExpandedRounds((prev) => ({
      ...prev,
      [roundNumber]: !prev[roundNumber],
    }));
  };

  const toggleAll = (expand: boolean) => {
    if (!data) return;
    const next: Record<number, boolean> = {};
    data.rounds.forEach((r) => {
      next[r.roundNumber] = expand;
    });
    setExpandedRounds(next);
  };

  const isLive = initialArena.status === 'LIVE' || data?.arena?.status === 'LIVE';

  return (
    <div className={cx(hideHeader ? "w-full" : "min-h-screen pb-12", "bg-[#131313] text-[#e5e2e1] font-['Geist'] antialiased selection:bg-[#22C55E]/30 w-full max-w-full")}>
      {/* Top Header / View Switcher Bar (Only when standalone) */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#27272A] bg-[rgba(20,20,20,0.85)] px-4 sm:px-8 md:px-12 py-3 backdrop-blur-xl w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] text-xs font-bold text-[#c4c7c8] hover:text-white transition-all active:scale-95 shadow-sm shrink-0"
                title="Return to Overview"
              >
                <span>←</span>
                <span className="hidden sm:inline font-mono">Overview</span>
              </button>
            ) : onSelectView ? (
              <button
                type="button"
                onClick={() => onSelectView('live')}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] text-xs font-bold text-[#c4c7c8] hover:text-white transition-all active:scale-95 shadow-sm shrink-0"
                title="Return to Live Arena"
              >
                <span>←</span>
                <span className="hidden sm:inline font-mono">Arena</span>
              </button>
            ) : (
              <Link
                href={`/arenas/${initialArena.code}/live`}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] text-xs font-bold text-[#c4c7c8] hover:text-white transition-all shadow-sm shrink-0"
                title="Return to Arena"
              >
                <span>←</span>
                <span className="hidden sm:inline font-mono">Arena</span>
              </Link>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">
                  POST-ROUND AUDIT
                </span>
                <span className="rounded bg-[#1c1c20] px-1.5 py-0.2 font-mono text-[10px] text-[#a1a1aa] border border-[#27272A]">
                  {initialArena.code}
                </span>
              </div>
              <h1 className="font-['Geist'] text-xs sm:text-base font-bold text-white tracking-tight truncate">
                {data?.arena?.name ?? initialArena.name}
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className={cx(hideHeader ? "w-full p-0" : "w-full px-4 sm:px-8 md:px-12 py-6", "flex flex-col gap-6 max-w-full")}>
        {/* Loading / Error States */}
        {loading && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 bg-[#111114] border border-[#27272A] rounded-xl animate-in fade-in-50 duration-200">
            <span className="material-symbols-outlined text-2xl text-[#22C55E] animate-spin">
              progress_activity
            </span>
            <span className="font-['Epilogue'] text-xs text-[#a1a1aa]">
              Compiling historical round trades, probabilities, and payouts...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-xl text-center">
            <p className="font-['Epilogue'] text-xs font-bold text-[#EF4444]">{error}</p>
            <button
              onClick={() => void fetchAnalysis()}
              className="mt-2 px-3 py-1 bg-[#EF4444] text-white rounded-md text-[11px] font-bold active:scale-95 transition-transform"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Header matching Admin Dashboard */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider bg-[#201f1f] text-[#c4c7c8] border border-[#27272A]">
                    {data.arena.marketCategory === 'CRYPTO_PRICE' ? 'Live Crypto Oracle' : 'Campus Prediction'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#38BDF8]/10 border border-[#38BDF8]/20 font-['Epilogue'] text-[10px] font-bold text-[#38BDF8]">
                    {data.arena.asset}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] text-[#8e9192]">
                    b={data.arena.liquidityParamB}
                  </span>
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 font-['Epilogue'] text-[10px] font-bold text-[#22C55E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      LIVE TELEMETRY
                    </span>
                  )}
                </div>
                <h1 className="font-['Geist'] text-3xl md:text-4xl font-bold text-white tracking-tight">
                  {data.arena.name}
                </h1>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#c4c7c8] hover:text-white px-4 py-2 rounded-full transition-all active:scale-95 shadow-sm"
                >
                  Collapse
                </button>
                <button
                  type="button"
                  onClick={() => void fetchAnalysis(true)}
                  disabled={refreshing}
                  className="bg-[#201f1f] hover:bg-[#2a2a2a] border border-[#27272A] font-['Epilogue'] text-xs font-bold text-[#22C55E] p-2.5 rounded-full transition-all active:scale-95 shadow-sm disabled:opacity-50"
                  title="Refresh analysis data"
                >
                  <span className={cx("material-symbols-outlined text-[18px]", refreshing && "animate-spin")}>refresh</span>
                </button>
              </div>
            </div>

            {/* Metrics Row matching Admin Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Volume</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-white flex items-baseline gap-1">
                  {formatPoints(data.summary.totalVolume, 0)}
                  <span className="text-xs text-[#8e9192] font-normal font-sans">arcs</span>
                </p>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Trades</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-white">
                  {data.summary.totalTrades}
                </p>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Rounds</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-white">
                  {data.summary.resolvedRounds} / {data.summary.totalRounds}
                </p>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#22C55E]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Accuracy</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-[#22C55E] flex items-baseline gap-1">
                  {data.summary.accuracyRate != null ? `${(data.summary.accuracyRate * 100).toFixed(0)}%` : '—'}
                  <span className="text-xs text-[#8e9192] font-normal font-sans">
                    ({data.summary.correctPredictions}/{data.summary.resolvedRounds})
                  </span>
                </p>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Brier Score</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-[#38BDF8]">
                  {data.summary.averageBrierScore != null ? data.summary.averageBrierScore.toFixed(3) : '—'}
                </p>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#F59E0B]/40 transition-all">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Payouts</p>
                <p className="font-['Epilogue'] text-2xl lg:text-3xl font-bold text-[#F59E0B] flex items-baseline gap-1">
                  {formatPoints(data.summary.totalPayouts, 0)}
                  <span className="text-xs text-[#8e9192] font-normal font-sans">arcs</span>
                </p>
              </div>
            </div>

            {/* Round-by-Round Analysis Cards */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-[#c4c7c8]">
                  ROUNDS ({data.rounds.length})
                </h3>
                <span className="text-xs font-['Epilogue'] text-[#8e9192]">
                  Click to inspect round telemetry & trades
                </span>
              </div>

              {data.rounds.length === 0 ? (
                <div className="p-8 text-center bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl text-[#c4c7c8] font-['Geist'] text-sm backdrop-blur-md">
                  No rounds scheduled or recorded yet for this tournament.
                </div>
              ) : (
                data.rounds.map((round) => (
                  <RoundAnalysisCard
                    key={round.id}
                    round={round}
                    isExpanded={Boolean(expandedRounds[round.roundNumber])}
                    onToggle={() => toggleRound(round.roundNumber)}
                  />
                ))
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function RoundAnalysisCard({
  round,
  isExpanded,
  onToggle,
}: {
  round: RoundAnalysisItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isResolved = round.status === 'RESOLVED';
  const isLive = round.status === 'TRADING' || round.status === 'LOCKED';
  const outcomeYes = round.outcome === 'YES';
  const outcomeNo = round.outcome === 'NO';

  const priceUp = round.priceDelta != null ? round.priceDelta >= 0 : null;

  return (
    <article
      className={cx(
        'rounded-2xl border transition-all duration-200 overflow-hidden backdrop-blur-md',
        isLive && 'ring-1 ring-[#22C55E]/25 shadow-[0_0_15px_-3px_rgba(34,197,94,0.15)]',
        isExpanded
          ? 'bg-[#18181b] border-[#38BDF8]/40 shadow-lg'
          : 'bg-[rgba(20,20,20,0.7)] border-[#27272A] hover:bg-[#201f1f] hover:border-[#38BDF8]/40',
      )}
    >
      {/* Clickable Header Strip */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="p-3.5 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer select-none"
      >
        {/* Left: Round Badge & Question */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cx(
              "shrink-0 h-8 w-8 rounded-xl flex items-center justify-center font-['Epilogue'] font-bold text-xs border",
              isResolved
                ? outcomeYes
                  ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                  : outcomeNo
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                    : 'bg-[#eab308]/15 border-[#eab308]/40 text-[#eab308]'
                : isLive
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8] animate-pulse'
                  : 'bg-[#201f1f] border-[#27272A] text-[#8e9192]',
            )}
          >
            R{round.roundNumber}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-white">
                Round {round.roundNumber}
              </span>

              {/* Status Badge */}
              <span
                className={cx(
                  "px-2 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider border",
                  isResolved
                    ? 'bg-[#201f1f] text-[#c4c7c8] border-[#27272A]'
                    : isLive
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30 animate-pulse'
                      : 'bg-[#201f1f] text-[#8e9192] border-[#27272A]',
                )}
              >
                {round.status}
              </span>

              {/* Outcome Badge */}
              {isResolved && (
                <span
                  className={cx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-bold uppercase tracking-wider border flex items-center gap-1.5",
                    outcomeYes
                      ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50'
                      : outcomeNo
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
                        : 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/50',
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {outcomeYes ? 'YES WON' : outcomeNo ? 'NO WON' : 'VOIDED'}
                </span>
              )}
            </div>

            <h4 className="font-['Geist'] text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-xl">
              {round.question}
            </h4>
          </div>
        </div>

        {/* Right: Key Summary Snapshot Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 text-xs">
          {/* Strike vs Close */}
          {round.openPrice != null && (
            <div className="flex items-center gap-1.5 bg-[#201f1f] border border-[#27272A] px-3 py-1 rounded-full text-xs font-['Epilogue']">
              <span className="text-[#8e9192] text-[10px] uppercase font-bold">Strike</span>
              <span className="font-bold text-white">{formatPrice(round.openPrice)}</span>
              {round.closePrice != null && (
                <>
                  <span className="text-[#8e9192]">→</span>
                  <span
                    className={cx(
                      'font-bold',
                      priceUp ? 'text-[#22C55E]' : 'text-[#EF4444]',
                    )}
                  >
                    {formatPrice(round.closePrice)}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Final Probability */}
          <div className="flex items-center gap-1.5 bg-[#201f1f] border border-[#27272A] px-3 py-1 rounded-full text-xs font-['Epilogue']">
            <span className="text-[#8e9192] text-[10px] uppercase font-bold">Odds</span>
            <span className="font-bold text-[#22C55E]">
              {formatProbability(round.finalProbability, 1)} YES
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5 bg-[#201f1f] border border-[#27272A] px-3 py-1 rounded-full text-xs font-['Epilogue']">
            <span className="text-[#8e9192] text-[10px] uppercase font-bold">Vol</span>
            <span className="font-bold text-white">{formatPoints(round.totalVolume, 0)} arcs</span>
          </div>

          {/* Chevron */}
          <span
            className={cx(
              'material-symbols-outlined text-[20px] text-[#c4c7c8] transition-transform duration-150',
              isExpanded && 'rotate-180 text-white',
            )}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded Analysis Section */}
      {isExpanded && (
        <div className="border-t border-[#27272A] p-4 sm:p-5 bg-[#141416]/90 flex flex-col gap-4 animate-in fade-in-50 duration-200">
          {/* 4-Card Analysis KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Asset & Strike Movement */}
            <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider block">
                  ASSET MOVEMENT
                </span>
                <div className="mt-2 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Strike:</span>
                  <span className="text-sm font-bold text-white">{formatPrice(round.openPrice)}</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Close:</span>
                  <span className="text-sm font-bold text-white">{formatPrice(round.closePrice)}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between">
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#8e9192]">DELTA:</span>
                <span
                  className={cx(
                    "font-['Epilogue'] text-xs font-bold",
                    round.priceDelta != null && round.priceDelta >= 0
                      ? 'text-[#22C55E]'
                      : 'text-[#EF4444]',
                  )}
                >
                  {round.priceDelta != null
                    ? `${round.priceDelta >= 0 ? '+' : ''}${round.priceDelta.toFixed(2)} (${round.priceDeltaPercent != null ? (round.priceDeltaPercent >= 0 ? '+' : '') + round.priceDeltaPercent.toFixed(2) + '%' : ''})`
                    : 'Awaiting close'}
                </span>
              </div>
            </div>

            {/* 2. Opening vs Final Probability */}
            <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider block">
                  PROBABILITY SHIFT
                </span>
                <div className="mt-2 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Open:</span>
                  <span className="text-sm font-bold text-white">50.0%</span>
                </div>
                <div className="mt-1 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Close:</span>
                  <span className="text-sm font-bold text-[#22C55E]">
                    {formatProbability(round.finalProbability, 1)} YES
                  </span>
                </div>
              </div>

              {/* Dual Probability Bar */}
              <div className="mt-3 pt-2 border-t border-[#27272A]">
                <div className="h-2 w-full rounded-full bg-[#EF4444]/25 overflow-hidden flex border border-[#27272A]">
                  <div
                    className="h-full bg-[#22C55E] transition-all"
                    style={{ width: `${Math.min(98, Math.max(2, round.finalProbability * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-['Epilogue'] font-medium text-[#8e9192] mt-1">
                  <span>{(round.finalProbability * 100).toFixed(0)}% YES</span>
                  <span>{((1 - round.finalProbability) * 100).toFixed(0)}% NO</span>
                </div>
              </div>
            </div>

            {/* 3. Trading Volume & Activity */}
            <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider block">
                  TRADING ACTIVITY
                </span>
                <div className="mt-2 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Traded:</span>
                  <span className="text-sm font-bold text-white">
                    {formatPoints(round.totalVolume, 0)} arcs
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between font-['Epilogue']">
                  <span className="text-xs text-[#8e9192]">Trades:</span>
                  <span className="text-sm font-bold text-white">{round.tradesCount}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between text-xs font-['Epilogue'] font-bold">
                <span className="text-[#22C55E]">Y: {formatPoints(round.yesVolume, 0)}</span>
                <span className="text-[#8e9192]">|</span>
                <span className="text-[#EF4444]">N: {formatPoints(round.noVolume, 0)}</span>
              </div>
            </div>

            {/* 4. Accuracy & Calibration Verdict */}
            <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#c4c7c8] uppercase tracking-wider block">
                  CALIBRATION
                </span>
                <div className="mt-2 font-['Geist'] text-xs font-semibold text-white leading-tight line-clamp-2">
                  {round.calibration.verdict}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between font-['Epilogue'] text-xs">
                <span className="text-[#8e9192] text-[10px] uppercase font-bold">Brier:</span>
                <span className="font-bold text-[#38BDF8]">
                  {round.calibration.brierScore != null ? round.calibration.brierScore : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Probability Movement Chart */}
          <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#22C55E]">timeline</span>
                YES / NO PROBABILITY TIMELINE
              </span>
              <span className="font-['Epilogue'] text-xs text-[#8e9192]">
                {round.probabilityTimeline.length} points
              </span>
            </div>

            <ProbabilityHistoryChart timeline={round.probabilityTimeline} />
          </div>

          {/* Participant Performance & Payouts */}
          <div className="bg-[#18181b] border border-[#27272A] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-[#F59E0B]">military_tech</span>
                ROUND PARTICIPANTS & PAYOUTS
              </span>
              <div className="flex items-center gap-3 text-xs font-['Epilogue']">
                <span className="text-[#8e9192]">
                  Traders: <strong className="text-white font-bold">{round.uniqueParticipants}</strong>
                </span>
                <span className="text-[#8e9192]">
                  Payout: <strong className="text-[#22C55E] font-bold">{formatPoints(round.totalPayout, 0)} arcs</strong>
                </span>
              </div>
            </div>

            {round.topPerformers.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#8e9192] font-['Geist']">
                No participant predictions recorded for this round.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-['Epilogue']">
                  <thead>
                    <tr className="border-b border-[#27272A] text-[#c4c7c8] font-bold uppercase text-[10px]">
                      <th className="py-2 px-2.5">Participant</th>
                      <th className="py-2 px-2.5">Shares</th>
                      <th className="py-2 px-2.5">Cost</th>
                      <th className="py-2 px-2.5">Payout</th>
                      <th className="py-2 px-2.5 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/60">
                    {round.topPerformers.map((performer, idx) => (
                      <tr key={performer.userId} className="hover:bg-[#201f1f] transition-colors">
                        <td className="py-2 px-2.5 flex items-center gap-2">
                          <span className="text-[#8e9192] font-bold w-4 text-center text-xs">#{idx + 1}</span>
                          <span className="font-['Geist'] font-semibold text-white truncate max-w-[160px] text-xs">
                            {performer.name}
                          </span>
                          {performer.isBot && (
                            <span className="px-1.5 py-0.2 rounded bg-[#201f1f] text-[9px] text-[#8e9192] border border-[#27272A]">
                              BOT
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-xs">
                          {performer.sharesYes > 0 && (
                            <span className="text-[#22C55E] font-bold mr-1.5">
                              {performer.sharesYes.toFixed(1)} Y
                            </span>
                          )}
                          {performer.sharesNo > 0 && (
                            <span className="text-[#EF4444] font-bold">
                              {performer.sharesNo.toFixed(1)} N
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-white text-xs font-bold">
                          {formatPoints(performer.cost, 0)} arcs
                        </td>
                        <td className="py-2 px-2.5 text-[#F59E0B] font-bold text-xs">
                          {formatPoints(performer.payout, 0)} arcs
                        </td>
                        <td
                          className={cx(
                            'py-2 px-2.5 text-right font-bold text-xs',
                            performer.pnl > 0
                              ? 'text-[#22C55E]'
                              : performer.pnl < 0
                                ? 'text-[#EF4444]'
                                : 'text-[#8e9192]',
                          )}
                        >
                          {performer.pnl > 0 ? `+${formatPoints(performer.pnl, 0)}` : formatPoints(performer.pnl, 0)} arcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

/** Crisp SVG probability timeline chart */
function ProbabilityHistoryChart({
  timeline,
}: {
  timeline: RoundAnalysisItem['probabilityTimeline'];
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-[#8e9192] font-['Geist']">
        No trades in this round yet
      </div>
    );
  }

  const width = 800;
  const height = 90;
  const padding = 16;

  // Map probability 0..1 to y coordinates (1 at top, 0 at bottom)
  const getY = (p: number) => height - padding - p * (height - padding * 2);
  const getX = (idx: number, total: number) =>
    padding + (idx / Math.max(1, total - 1)) * (width - padding * 2);

  const points = timeline.map((pt, idx) => ({
    x: getX(idx, timeline.length),
    y: getY(pt.priceYes),
    p: pt.priceYes,
    time: pt.time,
    side: pt.side,
  }));

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  // Fill path to 50% baseline
  const baselineY = getY(0.5);
  const fillD = `${pathD} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`;

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-24 sm:h-28 overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.20" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 50% Baseline (Even Odds) */}
        <line
          x1={padding}
          y1={baselineY}
          x2={width - padding}
          y2={baselineY}
          stroke="#27272A"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={width - padding + 4}
          y={baselineY + 3}
          fill="#8e9192"
          fontSize="9"
          fontFamily="Epilogue, sans-serif"
        >
          50%
        </text>

        {/* Area fill */}
        <path d={fillD} fill="url(#probGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#22C55E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={idx === points.length - 1 ? 3 : 2}
            fill={pt.side === 'YES' ? '#22C55E' : pt.side === 'NO' ? '#EF4444' : '#ffffff'}
            stroke="#18181b"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
