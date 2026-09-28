'use client';

import { useCallback, useEffect, useState } from 'react';

import type { TournamentAnalysisPayload, RoundAnalysisItem } from '@/app/api/arenas/[code]/analysis/route';
import { cx, formatPoints, formatPrice, formatProbability } from '@/lib/format';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

interface TournamentAnalysisProps {
  initialArena: ArenaPublicInfo;
  onSelectView?: (view: 'live' | 'screen' | 'analysis') => void;
}

export function TournamentAnalysis({ initialArena, onSelectView }: TournamentAnalysisProps) {
  const code = initialArena.code;
  const [data, setData] = useState<TournamentAnalysisPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({});

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/analysis`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        throw new Error('Failed to load tournament analysis data');
      }
      const json: TournamentAnalysisPayload = await res.json();
      setData(json);

      // Default expand all resolved rounds or latest round
      const initialExpanded: Record<number, boolean> = {};
      json.rounds.forEach((r, idx) => {
        if (r.status === 'TRADING' || r.status === 'LOCKED' || idx >= json.rounds.length - 2 || idx === 0) {
          initialExpanded[r.roundNumber] = true;
        }
      });
      setExpandedRounds(initialExpanded);
    } catch (err: any) {
      setError(err?.message || 'Error loading analysis');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchAnalysis();
  }, [fetchAnalysis]);

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

  return (
    <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] font-['Geist'] pb-12 antialiased selection:bg-[#22C55E]/30">
      {/* Top Header / View Switcher Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#27272A] bg-[#0c0c0e]/95 px-4 sm:px-6 py-2.5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-widest text-[#22C55E]">
                POST-ROUND AUDIT
              </span>
              <span className="rounded bg-[#1c1c20] px-1.5 py-0.2 font-mono text-[10px] text-[#a1a1aa] border border-[#27272A]">
                {initialArena.code}
              </span>
            </div>
            <h1 className="font-['Geist'] text-sm sm:text-base font-bold text-white tracking-tight">
              {data?.arena?.name ?? initialArena.name} — Analysis
            </h1>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141417] border border-[#27272A]">
          <button
            type="button"
            onClick={() => onSelectView?.('live')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] text-[#22C55E]">bolt</span>
            <span>Live Arena</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView?.('screen')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-medium text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] text-[#38BDF8]">tv</span>
            <span>Big Screen</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-['Epilogue'] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30"
          >
            <span className="material-symbols-outlined text-[14px]">analytics</span>
            <span>Analysis</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 pt-4 sm:pt-5 flex flex-col gap-3.5">
        {/* Loading / Error States */}
        {loading && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 bg-[#111114] border border-[#27272A] rounded-xl">
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
              className="mt-2 px-3 py-1 bg-[#EF4444] text-white rounded-md text-[11px] font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Streamlined Tournament Overview Card */}
            <section className="bg-[#101014] border border-[#27272A] rounded-xl p-3 sm:p-3.5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[#27272A]/70 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                    <h2 className="font-['Geist'] text-sm sm:text-base font-bold text-white">
                      {data.arena.name}
                    </h2>
                    <span className="text-xs text-[#71717a]">·</span>
                    <span className="font-['Epilogue'] text-[11px] text-[#a1a1aa]">
                      {data.arena.asset} · b={data.arena.liquidityParamB}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="px-2 py-0.5 rounded bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-[10px] font-['Epilogue'] font-medium text-white transition-colors cursor-pointer"
                  >
                    Expand All
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="px-2 py-0.5 rounded bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-[10px] font-['Epilogue'] font-medium text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                  >
                    Collapse
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchAnalysis()}
                    className="p-1 rounded bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-[#22C55E] transition-colors cursor-pointer"
                    title="Refresh analysis data"
                  >
                    <span className="material-symbols-outlined text-[15px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Minimalist Summary KPI Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2.5">
                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TOTAL VOLUME
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white mt-0.5">
                    {formatPoints(data.summary.totalVolume, 0)} pts
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TRADES
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white mt-0.5">
                    {data.summary.totalTrades}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    ROUNDS
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-white mt-0.5">
                    {data.summary.resolvedRounds} / {data.summary.totalRounds}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    ACCURACY
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#22C55E] mt-0.5">
                    {data.summary.accuracyRate != null
                      ? `${(data.summary.accuracyRate * 100).toFixed(0)}%`
                      : '—'}
                    <span className="text-[10px] text-[#71717a] ml-1 font-normal">
                      ({data.summary.correctPredictions}/{data.summary.resolvedRounds})
                    </span>
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    BRIER SCORE
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#38BDF8] mt-0.5">
                    {data.summary.averageBrierScore != null
                      ? data.summary.averageBrierScore.toFixed(3)
                      : '—'}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A]/80 rounded-lg px-2.5 py-1.5 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[9px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    PAYOUTS
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-[#F59E0B] mt-0.5">
                    {formatPoints(data.summary.totalPayouts, 0)} pts
                  </span>
                </div>
              </div>
            </section>

            {/* Round-by-Round Analysis Cards */}
            <section className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-['Epilogue'] text-[11px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                  ROUNDS ({data.rounds.length})
                </h3>
                <span className="text-[11px] font-mono text-[#71717a]">
                  Click to inspect round telemetry & trades
                </span>
              </div>

              {data.rounds.length === 0 ? (
                <div className="p-6 text-center bg-[#101014] border border-[#27272A] rounded-xl text-[#a1a1aa] font-['Epilogue'] text-xs">
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
        'rounded-xl border transition-all duration-150 overflow-hidden',
        isExpanded
          ? 'bg-[#101014] border-[#3f3f46]'
          : 'bg-[#0e0e11] border-[#27272A] hover:border-[#38383e]',
      )}
    >
      {/* Clickable Header Strip */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="p-3 sm:px-4 sm:py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 cursor-pointer select-none"
      >
        {/* Left: Round Badge & Question */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={cx(
              'shrink-0 h-7 w-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs border',
              isResolved
                ? outcomeYes
                  ? 'bg-[#22C55E]/15 border-[#22C55E]/40 text-[#22C55E]'
                  : outcomeNo
                    ? 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#EF4444]'
                    : 'bg-[#eab308]/15 border-[#eab308]/40 text-[#eab308]'
                : isLive
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8]/40 text-[#38BDF8] animate-pulse'
                  : 'bg-[#18181b] border-[#27272A] text-[#71717a]',
            )}
          >
            R{round.roundNumber}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="font-['Epilogue'] text-[11px] font-bold uppercase tracking-wider text-white">
                Round {round.roundNumber}
              </span>

              {/* Status Badge */}
              <span
                className={cx(
                  "px-1.5 py-0.2 rounded text-[9px] font-['Epilogue'] font-bold uppercase tracking-wider border",
                  isResolved
                    ? 'bg-[#1c1c20] text-[#a1a1aa] border-[#27272A]'
                    : isLive
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30 animate-pulse'
                      : 'bg-[#18181b] text-[#71717a] border-[#27272A]',
                )}
              >
                {round.status}
              </span>

              {/* Outcome Badge */}
              {isResolved && (
                <span
                  className={cx(
                    "px-2 py-0.2 rounded text-[9px] font-['Epilogue'] font-bold uppercase tracking-wider border flex items-center gap-1",
                    outcomeYes
                      ? 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50'
                      : outcomeNo
                        ? 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50'
                        : 'bg-[#eab308]/20 text-[#eab308] border-[#eab308]/50',
                  )}
                >
                  <span className="w-1 h-1 rounded-full bg-current" />
                  {outcomeYes ? 'YES WON' : outcomeNo ? 'NO WON' : 'VOIDED'}
                </span>
              )}
            </div>

            <h4 className="font-['Geist'] text-xs sm:text-sm font-semibold text-white truncate max-w-lg">
              {round.question}
            </h4>
          </div>
        </div>

        {/* Right: Key Summary Snapshot Pills */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0 text-xs font-mono">
          {/* Strike vs Close */}
          {round.openPrice != null && (
            <div className="flex items-center gap-1 bg-[#141418] border border-[#27272A] px-2 py-0.5 rounded-md text-[11px]">
              <span className="text-[#a1a1aa] text-[9px] uppercase font-['Epilogue']">Strike</span>
              <span className="font-bold text-white">{formatPrice(round.openPrice)}</span>
              {round.closePrice != null && (
                <>
                  <span className="text-[#71717a]">→</span>
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
          <div className="flex items-center gap-1 bg-[#141418] border border-[#27272A] px-2 py-0.5 rounded-md text-[11px]">
            <span className="text-[#a1a1aa] text-[9px] uppercase font-['Epilogue']">Odds</span>
            <span className="font-bold text-[#22C55E]">
              {formatProbability(round.finalProbability, 1)} YES
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1 bg-[#141418] border border-[#27272A] px-2 py-0.5 rounded-md text-[11px]">
            <span className="text-[#a1a1aa] text-[9px] uppercase font-['Epilogue']">Vol</span>
            <span className="font-bold text-white">{formatPoints(round.totalVolume, 0)} pts</span>
          </div>

          {/* Chevron */}
          <span
            className={cx(
              'material-symbols-outlined text-[18px] text-[#a1a1aa] transition-transform duration-150',
              isExpanded && 'rotate-180 text-white',
            )}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded Analysis Section */}
      {isExpanded && (
        <div className="border-t border-[#27272A] p-3 sm:p-4 bg-[#0c0c0f] flex flex-col gap-3.5 animate-fadeIn">
          {/* 4-Card Analysis KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Asset & Strike Movement */}
            <div className="bg-[#121216] border border-[#27272A] rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  ASSET MOVEMENT
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Strike:</span>
                  <span className="text-xs font-bold text-white">{formatPrice(round.openPrice)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Close:</span>
                  <span className="text-xs font-bold text-white">{formatPrice(round.closePrice)}</span>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#27272A] flex items-center justify-between">
                <span className="font-['Epilogue'] text-[9px] font-semibold text-[#a1a1aa]">DELTA:</span>
                <span
                  className={cx(
                    'font-mono text-[11px] font-bold',
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
            <div className="bg-[#121216] border border-[#27272A] rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  PROBABILITY SHIFT
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Open:</span>
                  <span className="text-xs font-bold text-white">50.0%</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Close:</span>
                  <span className="text-xs font-bold text-[#22C55E]">
                    {formatProbability(round.finalProbability, 1)} YES
                  </span>
                </div>
              </div>

              {/* Dual Probability Bar */}
              <div className="mt-2 pt-1.5 border-t border-[#27272A]">
                <div className="h-2 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex border border-[#27272A]">
                  <div
                    className="h-full bg-[#22C55E] transition-all"
                    style={{ width: `${Math.min(98, Math.max(2, round.finalProbability * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-[#a1a1aa] mt-0.5">
                  <span>{(round.finalProbability * 100).toFixed(0)}% YES</span>
                  <span>{((1 - round.finalProbability) * 100).toFixed(0)}% NO</span>
                </div>
              </div>
            </div>

            {/* 3. Trading Volume & Activity */}
            <div className="bg-[#121216] border border-[#27272A] rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  TRADING ACTIVITY
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Traded:</span>
                  <span className="text-xs font-bold text-white">
                    {formatPoints(round.totalVolume, 0)} pts
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-[#a1a1aa]">Trades:</span>
                  <span className="text-xs font-bold text-white">{round.tradesCount}</span>
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#27272A] flex items-center justify-between text-[10px] font-mono">
                <span className="text-[#22C55E]">Y: {formatPoints(round.yesVolume, 0)}</span>
                <span className="text-[#71717a]">|</span>
                <span className="text-[#EF4444]">N: {formatPoints(round.noVolume, 0)}</span>
              </div>
            </div>

            {/* 4. Accuracy & Calibration Verdict */}
            <div className="bg-[#121216] border border-[#27272A] rounded-lg p-2.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[9px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  CALIBRATION
                </span>
                <div className="mt-1 font-['Epilogue'] text-[11px] font-bold text-white leading-tight truncate">
                  {round.calibration.verdict}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-[#27272A] flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#a1a1aa] text-[9px] font-['Epilogue']">Brier:</span>
                <span className="font-bold text-[#38BDF8]">
                  {round.calibration.brierScore != null ? round.calibration.brierScore : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Probability Movement Chart */}
          <div className="bg-[#121216] border border-[#27272A] rounded-lg p-3 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-['Epilogue'] text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#22C55E]">timeline</span>
                YES / NO PROBABILITY TIMELINE
              </span>
              <span className="font-mono text-[11px] text-[#a1a1aa]">
                {round.probabilityTimeline.length} points
              </span>
            </div>

            <ProbabilityHistoryChart timeline={round.probabilityTimeline} />
          </div>

          {/* Participant Performance & Payouts */}
          <div className="bg-[#121216] border border-[#27272A] rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-[#27272A]/80 pb-2">
              <span className="font-['Epilogue'] text-[11px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-[#F59E0B]">military_tech</span>
                ROUND PARTICIPANTS & PAYOUTS
              </span>
              <div className="flex items-center gap-2.5 text-[11px] font-mono">
                <span className="text-[#a1a1aa]">
                  Traders: <strong className="text-white">{round.uniqueParticipants}</strong>
                </span>
                <span className="text-[#a1a1aa]">
                  Payout: <strong className="text-[#22C55E]">{formatPoints(round.totalPayout, 0)} pts</strong>
                </span>
              </div>
            </div>

            {round.topPerformers.length === 0 ? (
              <div className="py-2.5 text-center text-xs text-[#a1a1aa] font-mono">
                No participant predictions recorded for this round.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#27272A] text-[#a1a1aa] font-['Epilogue'] uppercase text-[9px]">
                      <th className="py-1.5 px-2">Participant</th>
                      <th className="py-1.5 px-2">Shares</th>
                      <th className="py-1.5 px-2">Cost</th>
                      <th className="py-1.5 px-2">Payout</th>
                      <th className="py-1.5 px-2 text-right">PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/50">
                    {round.topPerformers.map((performer, idx) => (
                      <tr key={performer.userId} className="hover:bg-[#18181e] transition-colors">
                        <td className="py-1.5 px-2 flex items-center gap-1.5">
                          <span className="text-[#71717a] font-bold w-3 text-center text-[11px]">#{idx + 1}</span>
                          <span className="font-['Geist'] font-medium text-white truncate max-w-[150px] text-xs">
                            {performer.name}
                          </span>
                          {performer.isBot && (
                            <span className="px-1 py-0.2 rounded bg-[#27272A] text-[8px] text-[#a1a1aa] font-['Epilogue']">
                              BOT
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 text-[11px]">
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
                        <td className="py-1.5 px-2 text-white text-[11px]">
                          {formatPoints(performer.cost, 0)} pts
                        </td>
                        <td className="py-1.5 px-2 text-[#F59E0B] font-bold text-[11px]">
                          {formatPoints(performer.payout, 0)} pts
                        </td>
                        <td
                          className={cx(
                            'py-1.5 px-2 text-right font-bold text-[11px]',
                            performer.pnl > 0
                              ? 'text-[#22C55E]'
                              : performer.pnl < 0
                                ? 'text-[#EF4444]'
                                : 'text-[#a1a1aa]',
                          )}
                        >
                          {performer.pnl > 0 ? `+${formatPoints(performer.pnl, 0)}` : formatPoints(performer.pnl, 0)} pts
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
      <div className="h-24 flex items-center justify-center text-xs text-[#71717a] font-mono">
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
          stroke="#3f3f46"
          strokeDasharray="3 3"
          strokeWidth="1"
        />
        <text
          x={width - padding + 4}
          y={baselineY + 3}
          fill="#71717a"
          fontSize="9"
          fontFamily="monospace"
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
            stroke="#121216"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
}
