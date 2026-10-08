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
    <div className={cx(hideHeader ? "w-full" : "min-h-screen pb-12", "bg-[#000000] text-[#e5e2e1] font-['Geist'] antialiased selection:bg-[#22C55E]/30 w-full max-w-full")}>
      {/* Top Header / View Switcher Bar (Only when standalone) */}
      {!hideHeader && (
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#27272A] bg-[#000000]/85 px-4 sm:px-8 md:px-12 py-3 backdrop-blur-xl w-full max-w-full">
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
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 hover:text-white transition-all shadow-sm shrink-0 font-sans"
                title="Return to Arena"
              >
                <span>←</span>
                <span className="hidden sm:inline font-mono">Arena</span>
              </Link>
            )}

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
                  Post-Round Audit
                </span>
                <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 border border-zinc-700/60">
                  {initialArena.code}
                </span>
              </div>
              <h1 className="font-sans text-xs sm:text-base font-semibold text-zinc-100 tracking-tight truncate">
                {data?.arena?.name ?? initialArena.name}
              </h1>
            </div>
          </div>
        </header>
      )}

      <main className={cx(hideHeader ? "w-full p-0" : "w-full px-4 sm:px-8 md:px-12 py-6", "flex flex-col gap-6 max-w-full")}>
        {/* Loading / Error States */}
        {loading && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl animate-in fade-in-50 duration-200">
            <span className="material-symbols-outlined text-2xl text-emerald-400 animate-spin">
              progress_activity
            </span>
            <span className="font-sans text-xs text-zinc-400">
              Compiling historical round trades, probabilities, and payouts...
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-center">
            <p className="font-sans text-xs font-medium text-rose-400">{error}</p>
            <button
              onClick={() => void fetchAnalysis()}
              className="mt-2 px-3 py-1 bg-rose-500 text-white rounded-md text-[11px] font-semibold font-sans active:scale-95 transition-transform"
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
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {data.arena.marketCategory === 'CRYPTO_PRICE' ? 'Live Crypto Oracle' : 'Campus Prediction'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 font-mono text-[10px] font-semibold text-sky-400">
                    {data.arena.asset}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 font-mono text-[10px] text-zinc-500">
                    b={data.arena.liquidityParamB}
                  </span>
                  {isLive && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 font-mono text-[10px] font-bold text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE TELEMETRY
                    </span>
                  )}
                </div>
                <h1 className="font-sans text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
                  {data.arena.name}
                </h1>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-sans text-xs font-medium text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-sans text-xs font-medium text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm"
                >
                  Collapse
                </button>
                <button
                  type="button"
                  onClick={() => void fetchAnalysis(true)}
                  disabled={refreshing}
                  className="bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-sans text-xs font-medium text-emerald-400 p-1.5 rounded-lg transition-all active:scale-95 shadow-sm disabled:opacity-50 flex items-center justify-center"
                  title="Refresh analysis data"
                >
                  <span className={cx("material-symbols-outlined text-[18px]", refreshing && "animate-spin")}>refresh</span>
                </button>
              </div>
            </div>

            {/* Metrics Row matching Admin Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-zinc-700 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Total Volume</p>
                <p className="font-mono text-2xl font-bold text-zinc-100 flex items-baseline gap-1 tabular-nums">
                  {formatPoints(data.summary.totalVolume, 0)}
                  <span className="text-xs text-zinc-500 font-normal font-sans">arcs</span>
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-zinc-700 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Trades</p>
                <p className="font-mono text-2xl font-bold text-zinc-100 tabular-nums">
                  {data.summary.totalTrades}
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-zinc-700 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Rounds</p>
                <p className="font-mono text-2xl font-bold text-zinc-100 tabular-nums">
                  {data.summary.resolvedRounds} <span className="text-zinc-500 text-lg font-normal">/ {data.summary.totalRounds}</span>
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-emerald-500/30 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Accuracy</p>
                <p className="font-mono text-2xl font-bold text-emerald-400 flex items-baseline gap-1.5 tabular-nums">
                  {data.summary.accuracyRate != null ? `${(data.summary.accuracyRate * 100).toFixed(0)}%` : '—'}
                  <span className="text-xs text-zinc-500 font-normal font-sans">
                    ({data.summary.correctPredictions}/{data.summary.resolvedRounds})
                  </span>
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-sky-500/30 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Brier Score</p>
                <p className="font-mono text-2xl font-bold text-sky-400 tabular-nums">
                  {data.summary.averageBrierScore != null ? data.summary.averageBrierScore.toFixed(3) : '—'}
                </p>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 backdrop-blur-md hover:border-amber-500/30 transition-all shadow-sm">
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 font-sans">Total Payouts</p>
                <p className="font-mono text-2xl font-bold text-amber-400 flex items-baseline gap-1 tabular-nums">
                  {formatPoints(data.summary.totalPayouts, 0)}
                  <span className="text-xs text-zinc-500 font-normal font-sans">arcs</span>
                </p>
              </div>
            </div>

            {/* Round-by-Round Analysis Cards */}
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-sans">
                  Rounds ({data.rounds.length})
                </h3>
                <span className="text-xs text-zinc-500 font-sans">
                  Click to inspect round telemetry &amp; trades
                </span>
              </div>

              {data.rounds.length === 0 ? (
                <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl text-zinc-400 font-sans text-sm backdrop-blur-md">
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
        isLive && 'ring-1 ring-emerald-500/30 shadow-[0_0_25px_-4px_rgba(16,185,129,0.2)]',
        isExpanded
          ? 'bg-gradient-to-b from-zinc-900/95 to-zinc-950/95 border-zinc-700/80 shadow-2xl ring-1 ring-white/[0.05]'
          : 'bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 border-white/[0.08] hover:border-white/[0.16] hover:from-zinc-900/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]',
      )}
    >
      {/* Clickable Header Strip */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="p-4 sm:px-6 sm:py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
      >
        {/* Left: Round Badge, Badges & Question */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            className={cx(
              'shrink-0 h-9 w-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border transition-all shadow-sm',
              isResolved
                ? outcomeYes
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : outcomeNo
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                : isLive
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)] animate-pulse'
                  : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-400',
            )}
          >
            R{round.roundNumber}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-zinc-400">
                Round {round.roundNumber}
              </span>

              {/* Status Badge */}
              <span
                className={cx(
                  'px-2 py-0.5 rounded-full text-[10px] font-mono font-medium uppercase tracking-wider border',
                  isResolved
                    ? 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60'
                    : isLive
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 animate-pulse'
                      : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40',
                )}
              >
                {round.status}
              </span>

              {/* Outcome Badge */}
              {isResolved && (
                <span
                  className={cx(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 shadow-sm',
                    outcomeYes
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                      : outcomeNo
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {outcomeYes ? 'YES WON' : outcomeNo ? 'NO WON' : 'VOIDED'}
                </span>
              )}
            </div>

            <h4 className="font-sans text-sm sm:text-base font-semibold text-zinc-100 tracking-tight truncate max-w-2xl">
              {round.question}
            </h4>
          </div>
        </div>

        {/* Right: Structured Stat Columns */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 self-end lg:self-center">
          {/* Strike vs Close Block */}
          {round.openPrice != null && (
            <div className="flex flex-col items-end">
              <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Strike → Close</span>
              <div className="flex items-center gap-1 font-mono text-xs tabular-nums font-semibold mt-0.5">
                <span className="text-zinc-300">{formatPrice(round.openPrice)}</span>
                {round.closePrice != null && (
                  <>
                    <span className="text-zinc-600">→</span>
                    <span className={priceUp ? 'text-emerald-400' : 'text-rose-400'}>
                      {formatPrice(round.closePrice)}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Odds Block */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Consensus Odds</span>
            <span className="font-mono text-xs tabular-nums font-semibold text-emerald-400 mt-0.5">
              {formatProbability(round.finalProbability, 1)} YES
            </span>
          </div>

          {/* Volume Block */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500">Volume</span>
            <span className="font-mono text-xs tabular-nums font-semibold text-zinc-200 mt-0.5">
              {formatPoints(round.totalVolume, 0)}{' '}
              <span className="text-zinc-500 text-[10px] font-sans font-normal">arcs</span>
            </span>
          </div>

          {/* Chevron */}
          <span
            className={cx(
              'material-symbols-outlined text-[20px] text-zinc-400 transition-transform duration-200 ml-1 p-1 rounded-lg bg-zinc-800/60 border border-zinc-700/40',
              isExpanded && 'rotate-180 text-white bg-zinc-800',
            )}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded Analysis Section */}
      {isExpanded && (
        <div className="border-t border-white/[0.08] p-4 sm:p-6 bg-zinc-950/60 flex flex-col gap-5 animate-in fade-in-50 duration-200">
          {/* 4-Card Analysis KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Asset & Strike Movement */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono font-bold text-[10px]">
                      $
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                      Asset Movement
                    </span>
                  </div>
                  {round.priceDelta != null && (
                    <span
                      className={cx(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold tabular-nums border',
                        round.priceDelta >= 0
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                      )}
                    >
                      {round.priceDelta >= 0 ? '▲ +' : '▼ '}
                      {Math.abs(round.priceDelta).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-100 tabular-nums tracking-tight">
                  {formatPrice(round.closePrice ?? round.openPrice)}
                </div>
                <div className="text-xs text-zinc-500 font-sans mt-0.5 flex items-center gap-1.5">
                  <span>Strike:</span>
                  <span className="font-mono text-zinc-400 tabular-nums">{formatPrice(round.openPrice)}</span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-500 uppercase">Percent Change:</span>
                <span
                  className={cx(
                    'text-xs font-mono font-semibold tabular-nums',
                    round.priceDeltaPercent != null && round.priceDeltaPercent >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400',
                  )}
                >
                  {round.priceDeltaPercent != null
                    ? `${round.priceDeltaPercent >= 0 ? '+' : ''}${round.priceDeltaPercent.toFixed(2)}%`
                    : 'Awaiting close'}
                </span>
              </div>
            </div>

            {/* 2. Opening vs Final Probability */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-[10px]">
                      %
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                      Probability Shift
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    {round.finalProbability >= 0.5 ? 'YES Bias' : 'NO Bias'}
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums tracking-tight">
                  {formatProbability(round.finalProbability, 1)}
                  <span className="text-xs text-zinc-400 font-sans font-medium ml-1.5">YES</span>
                </div>
                <div className="text-xs text-zinc-500 font-sans mt-0.5 flex items-center gap-1.5">
                  <span>Open:</span>
                  <span className="font-mono text-zinc-400 tabular-nums">50.0%</span>
                  <span className="text-zinc-600">→</span>
                  <span>Shift:</span>
                  <span className="font-mono text-zinc-300 tabular-nums">
                    {((round.finalProbability - 0.5) * 100 >= 0 ? '+' : '')}
                    {((round.finalProbability - 0.5) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Dual Probability Bar */}
              <div className="mt-4 pt-2.5 border-t border-zinc-800/80">
                <div className="h-2 w-full rounded-full bg-zinc-800/90 overflow-hidden flex ring-1 ring-white/5 p-0.5">
                  <div
                    className="h-full bg-emerald-400 transition-all rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    style={{ width: `${Math.min(98, Math.max(2, round.finalProbability * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono font-medium text-zinc-500 mt-1.5 tabular-nums">
                  <span className="text-emerald-400 font-semibold">{(round.finalProbability * 100).toFixed(0)}% YES</span>
                  <span className="text-rose-400 font-semibold">{((1 - round.finalProbability) * 100).toFixed(0)}% NO</span>
                </div>
              </div>
            </div>

            {/* 3. Trading Volume & Activity */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center material-symbols-outlined text-xs">
                      bar_chart
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                      Trading Activity
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-zinc-400 bg-zinc-800/80 border border-zinc-700/60 tabular-nums">
                    {round.tradesCount} trades
                  </span>
                </div>

                <div className="text-xl sm:text-2xl font-mono font-bold text-zinc-100 tabular-nums tracking-tight">
                  {formatPoints(round.totalVolume, 0)}
                  <span className="text-xs text-zinc-500 font-sans font-normal ml-1.5">arcs</span>
                </div>
                <div className="text-xs text-zinc-500 font-sans mt-0.5">
                  Liquidity &amp; order flow turnover
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-mono font-medium tabular-nums">
                <span className="text-emerald-400 font-semibold">YES {formatPoints(round.yesVolume, 0)}</span>
                <span className="text-zinc-600">/</span>
                <span className="text-rose-400 font-semibold">NO {formatPoints(round.noVolume, 0)}</span>
              </div>
            </div>

            {/* 4. Accuracy & Calibration Verdict */}
            <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-4 flex flex-col justify-between shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] hover:border-white/[0.14] transition-all">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center material-symbols-outlined text-xs">
                      verified
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-sans">
                      Calibration
                    </span>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 tabular-nums">
                    Brier: {round.calibration.brierScore != null ? round.calibration.brierScore : '—'}
                  </span>
                </div>

                <div className="font-sans text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
                  {round.calibration.verdict}
                </div>
                <div className="text-xs text-zinc-500 font-sans mt-1">
                  Market consensus vs ground truth
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-500 text-[10px] uppercase font-sans">Quality Index:</span>
                <span className="font-mono font-semibold text-zinc-300 tabular-nums">
                  {round.calibration.brierScore != null && round.calibration.brierScore < 0.25
                    ? '★ High Calibration'
                    : '★ Moderate'}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Probability Movement Chart */}
          <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2 font-sans">
                <span className="material-symbols-outlined text-[16px] text-emerald-400">timeline</span>
                Probability Timeline (Consensus Drift)
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                  YES Probability
                </span>
                <span className="font-mono text-xs text-zinc-500 tabular-nums">
                  {round.probabilityTimeline.length} ticks
                </span>
              </div>
            </div>

            <ProbabilityHistoryChart timeline={round.probabilityTimeline} />
          </div>

          {/* Participant Performance & Payouts */}
          <div className="bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border border-white/[0.08] rounded-xl p-5 flex flex-col gap-3.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2 font-sans">
                <span className="material-symbols-outlined text-[16px] text-amber-400">military_tech</span>
                Round Participants &amp; Payouts
              </span>
              <div className="flex items-center gap-4 text-xs font-sans">
                <span className="text-zinc-400">
                  Traders: <strong className="text-zinc-200 font-mono font-semibold tabular-nums">{round.uniqueParticipants}</strong>
                </span>
                <span className="text-zinc-400">
                  Total Payout:{' '}
                  <strong className="text-emerald-400 font-mono font-semibold tabular-nums">
                    {formatPoints(round.totalPayout, 0)}{' '}
                    <span className="text-zinc-500 font-normal font-sans">arcs</span>
                  </strong>
                </span>
              </div>
            </div>

            {round.topPerformers.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 font-sans">
                No participant predictions recorded for this round.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-zinc-800/80 text-zinc-500 font-medium uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Participant</th>
                      <th className="py-2.5 px-3">Shares</th>
                      <th className="py-2.5 px-3 text-right">Cost (arcs)</th>
                      <th className="py-2.5 px-3 text-right">Payout (arcs)</th>
                      <th className="py-2.5 px-3 text-right">PnL (arcs)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40">
                    {round.topPerformers.map((performer, idx) => (
                      <tr key={performer.userId} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-2.5 px-3 flex items-center gap-2.5">
                          <span className="text-zinc-500 font-mono font-semibold w-5 text-center text-xs tabular-nums">
                            #{idx + 1}
                          </span>
                          <span className="font-sans font-medium text-zinc-200 truncate max-w-[160px] text-xs">
                            {performer.name}
                          </span>
                          {performer.isBot && (
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[9px] font-mono text-zinc-400 border border-zinc-700/50">
                              BOT
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {performer.sharesYes > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                +{performer.sharesYes.toFixed(1)} YES
                              </span>
                            )}
                            {performer.sharesNo > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                +{performer.sharesNo.toFixed(1)} NO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300 font-mono tabular-nums text-right font-medium">
                          {formatPoints(performer.cost, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-amber-400 font-mono tabular-nums text-right font-medium">
                          {formatPoints(performer.payout, 0)}
                        </td>
                        <td
                          className={cx(
                            'py-2.5 px-3 text-right font-mono font-semibold tabular-nums',
                            performer.pnl > 0
                              ? 'text-emerald-400'
                              : performer.pnl < 0
                                ? 'text-rose-400'
                                : 'text-zinc-500',
                          )}
                        >
                          {performer.pnl > 0 ? `+${formatPoints(performer.pnl, 0)}` : formatPoints(performer.pnl, 0)}
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

/** Institutional SVG probability timeline chart with smooth spline interpolation and glowing beacon */
function ProbabilityHistoryChart({
  timeline,
}: {
  timeline: RoundAnalysisItem['probabilityTimeline'];
}) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-zinc-500 font-sans">
        No trades recorded in this round yet
      </div>
    );
  }

  const width = 800;
  const height = 120;
  const paddingX = 24;
  const paddingTop = 14;
  const paddingBottom = 20;
  const chartHeight = height - paddingTop - paddingBottom;

  // Map probability 0..1 to y coordinates (1 at top, 0 at bottom)
  const getY = (p: number) => paddingTop + (1 - p) * chartHeight;
  const getX = (idx: number, total: number) =>
    paddingX + (idx / Math.max(1, total - 1)) * (width - paddingX * 2);

  // Smooth spline generator (Catmull-Rom to Cubic Bezier)
  const rawPoints = timeline.map((pt, idx) => ({
    x: getX(idx, timeline.length),
    y: getY(pt.priceYes),
    p: pt.priceYes,
    time: pt.time,
    side: pt.side,
  }));

  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(pts.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 5;
      const cp1y = p1.y + (p2.y - p0.y) / 5;
      const cp2x = p2.x - (p3.x - p1.x) / 5;
      const cp2y = p2.y - (p3.y - p1.y) / 5;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  };

  const pathD = buildSmoothPath(rawPoints);
  const bottomY = height - paddingBottom;
  const lastPoint = rawPoints[rawPoints.length - 1];
  const firstPoint = rawPoints[0];

  const fillD = `${pathD} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`;

  const baseline50 = getY(0.5);
  const baseline75 = getY(0.75);
  const baseline25 = getY(0.25);

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-28 sm:h-32 overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="probGradientSmooth" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#10b981" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
          </linearGradient>
          <filter id="chartGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#10b981" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* 75% reference line */}
        <line
          x1={paddingX}
          y1={baseline75}
          x2={width - paddingX}
          y2={baseline75}
          stroke="#27272a"
          strokeDasharray="2 3"
          strokeWidth="0.75"
        />
        <text
          x={width - paddingX + 6}
          y={baseline75 + 3}
          fill="#52525b"
          fontSize="9"
          fontFamily="monospace"
        >
          75%
        </text>

        {/* 50% Baseline (Even Odds) */}
        <line
          x1={paddingX}
          y1={baseline50}
          x2={width - paddingX}
          y2={baseline50}
          stroke="#3f3f46"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={width - paddingX + 6}
          y={baseline50 + 3}
          fill="#71717a"
          fontSize="9"
          fontFamily="monospace"
        >
          50%
        </text>

        {/* 25% reference line */}
        <line
          x1={paddingX}
          y1={baseline25}
          x2={width - paddingX}
          y2={baseline25}
          stroke="#27272a"
          strokeDasharray="2 3"
          strokeWidth="0.75"
        />
        <text
          x={width - paddingX + 6}
          y={baseline25 + 3}
          fill="#52525b"
          fontSize="9"
          fontFamily="monospace"
        >
          25%
        </text>

        {/* Smooth Area Gradient Fill */}
        <path d={fillD} fill="url(#probGradientSmooth)" />

        {/* Glowing Spline Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="#10b981"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#chartGlow)"
        />

        {/* Latest Active Price Beacon */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={7}
          fill="#10b981"
          opacity={0.25}
          className="animate-ping"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={4}
          fill="#10b981"
          stroke="#18181b"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
