'use client';

import Link from 'next/link';
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

      // Default expand all resolved rounds or round 1
      const initialExpanded: Record<number, boolean> = {};
      json.rounds.forEach((r, idx) => {
        // Expand latest 3 resolved rounds or active round
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
    <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] font-['Geist'] pb-16 antialiased selection:bg-[#22C55E]/30">
      {/* Top Header / View Switcher Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#27272A] bg-[#0c0c0e]/90 px-4 sm:px-8 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-['Epilogue'] text-[11px] font-black uppercase tracking-widest text-[#22C55E]">
                POST-ROUND & HISTORICAL AUDIT
              </span>
              <span className="rounded bg-[#1c1c20] px-2 py-0.5 font-mono text-[10px] text-[#a1a1aa] border border-[#27272A]">
                {initialArena.code}
              </span>
            </div>
            <h1 className="font-['Geist'] text-lg sm:text-xl font-black text-white tracking-tight">
              {data?.arena?.name ?? initialArena.name} — Tournament Analysis
            </h1>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141417] border border-[#27272A]">
          <button
            type="button"
            onClick={() => onSelectView?.('live')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-[#22C55E]">bolt</span>
            <span>Live Arena</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectView?.('screen')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-bold text-[#a1a1aa] hover:text-white hover:bg-[#1f1f23] transition-colors"
          >
            <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">tv</span>
            <span>Big Screen</span>
          </button>

          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Epilogue'] font-black bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">analytics</span>
            <span>Tournament Analysis</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 flex flex-col gap-6">
        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3 bg-[#111114] border border-[#27272A] rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-[#22C55E] animate-spin">
              progress_activity
            </span>
            <span className="font-['Epilogue'] text-sm text-[#a1a1aa]">
              Compiling historical round trades, probabilities, and payouts...
            </span>
          </div>
        )}

        {error && (
          <div className="p-6 bg-[#EF4444]/10 border border-[#EF4444]/40 rounded-2xl text-center">
            <p className="font-['Epilogue'] text-sm font-bold text-[#EF4444]">{error}</p>
            <button
              onClick={() => void fetchAnalysis()}
              className="mt-3 px-4 py-1.5 bg-[#EF4444] text-white rounded-lg text-xs font-bold"
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Tournament Telemetry Overview Card */}
            <section className="bg-[#101014] border border-[#27272A] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272A]/80 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <span className="font-['Epilogue'] text-xs font-bold text-white uppercase tracking-wider">
                      Tournament Audit Dashboard
                    </span>
                  </div>
                  <h2 className="font-['Geist'] text-2xl font-black text-white mt-1">
                    {data.arena.name}
                  </h2>
                  <p className="font-['Epilogue'] text-xs text-[#a1a1aa] mt-0.5">
                    Asset: <strong className="text-white">{data.arena.asset}</strong> · Host:{' '}
                    <strong className="text-white">{data.arena.organizerName}</strong> · Liquidity Parameter b:{' '}
                    <strong className="text-white">{data.arena.liquidityParamB}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-xs font-['Epilogue'] font-semibold text-white transition-colors"
                  >
                    Expand All Rounds
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-xs font-['Epilogue'] font-semibold text-[#a1a1aa] hover:text-white transition-colors"
                  >
                    Collapse All
                  </button>
                  <button
                    type="button"
                    onClick={() => void fetchAnalysis()}
                    className="p-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#27272A] text-[#22C55E] transition-colors"
                    title="Refresh analysis data"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Tournament Summary KPI Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-5">
                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TOTAL VOLUME
                  </span>
                  <span className="font-mono text-lg font-black text-white mt-0.5">
                    {formatPoints(data.summary.totalVolume, 0)} pts
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TOTAL TRADES
                  </span>
                  <span className="font-mono text-lg font-black text-white mt-0.5">
                    {data.summary.totalTrades}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    ROUNDS COMPLETED
                  </span>
                  <span className="font-mono text-lg font-black text-white mt-0.5">
                    {data.summary.resolvedRounds} / {data.summary.totalRounds}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    CROWD ACCURACY
                  </span>
                  <span className="font-mono text-lg font-black text-[#22C55E] mt-0.5">
                    {data.summary.accuracyRate != null
                      ? `${(data.summary.accuracyRate * 100).toFixed(0)}%`
                      : '—'}
                    <span className="text-xs text-[#a1a1aa] font-normal ml-1">
                      ({data.summary.correctPredictions}/{data.summary.resolvedRounds})
                    </span>
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    AVG BRIER SCORE
                  </span>
                  <span className="font-mono text-lg font-black text-[#38BDF8] mt-0.5">
                    {data.summary.averageBrierScore != null
                      ? data.summary.averageBrierScore.toFixed(3)
                      : '—'}
                  </span>
                </div>

                <div className="bg-[#141418] border border-[#27272A] rounded-xl p-3 flex flex-col justify-center">
                  <span className="font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider text-[#a1a1aa]">
                    TOTAL PAYOUTS
                  </span>
                  <span className="font-mono text-lg font-black text-[#F59E0B] mt-0.5">
                    {formatPoints(data.summary.totalPayouts, 0)} pts
                  </span>
                </div>
              </div>
            </section>

            {/* Round-by-Round Analysis Cards */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-['Epilogue'] text-xs font-black uppercase tracking-wider text-[#a1a1aa]">
                  ROUND-BY-ROUND BREAKDOWN ({data.rounds.length} ROUNDS)
                </h3>
                <span className="text-xs font-mono text-[#71717a]">
                  Click any round to view historical telemetry & trade book
                </span>
              </div>

              {data.rounds.length === 0 ? (
                <div className="p-8 text-center bg-[#101014] border border-[#27272A] rounded-2xl text-[#a1a1aa] font-['Epilogue'] text-sm">
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
  const isVoid = round.outcome === 'VOID';

  const priceUp = round.priceDelta != null ? round.priceDelta >= 0 : null;

  return (
    <article
      className={cx(
        'rounded-2xl border transition-all duration-200 overflow-hidden',
        isExpanded
          ? 'bg-[#101014] border-[#3f3f46] shadow-2xl'
          : 'bg-[#0e0e11] border-[#27272A] hover:border-[#38383e]',
      )}
    >
      {/* Clickable Header Strip */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
      >
        {/* Left: Round Badge & Question */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div
            className={cx(
              'shrink-0 h-11 w-11 rounded-xl flex items-center justify-center font-mono font-black text-sm border',
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
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-['Epilogue'] text-xs font-black uppercase tracking-wider text-white">
                Round {round.roundNumber}
              </span>

              {/* Status Badge */}
              <span
                className={cx(
                  "px-2 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-black uppercase tracking-wider border",
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
                    "px-2.5 py-0.5 rounded-full text-[10px] font-['Epilogue'] font-black uppercase tracking-wider border flex items-center gap-1",
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

            <h4 className="font-['Geist'] text-sm sm:text-base font-bold text-white truncate max-w-xl">
              {round.question}
            </h4>
          </div>
        </div>

        {/* Right: Key Summary Snapshot Pills */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0 text-xs font-mono">
          {/* Strike vs Close */}
          {round.openPrice != null && (
            <div className="flex items-center gap-1.5 bg-[#141418] border border-[#27272A] px-2.5 py-1 rounded-lg">
              <span className="text-[#a1a1aa] text-[10px] uppercase font-['Epilogue']">Strike</span>
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
          <div className="flex items-center gap-1.5 bg-[#141418] border border-[#27272A] px-2.5 py-1 rounded-lg">
            <span className="text-[#a1a1aa] text-[10px] uppercase font-['Epilogue']">Final Odds</span>
            <span className="font-bold text-[#22C55E]">
              {formatProbability(round.finalProbability, 1)} YES
            </span>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-1.5 bg-[#141418] border border-[#27272A] px-2.5 py-1 rounded-lg">
            <span className="text-[#a1a1aa] text-[10px] uppercase font-['Epilogue']">Volume</span>
            <span className="font-bold text-white">{formatPoints(round.totalVolume, 0)} pts</span>
          </div>

          {/* Chevron */}
          <span
            className={cx(
              'material-symbols-outlined text-[20px] text-[#a1a1aa] transition-transform duration-200',
              isExpanded && 'rotate-180 text-white',
            )}
          >
            expand_more
          </span>
        </div>
      </div>

      {/* Expanded Analysis Section */}
      {isExpanded && (
        <div className="border-t border-[#27272A] p-4 sm:p-6 bg-[#0c0c0f] flex flex-col gap-6 animate-fadeIn">
          {/* 4-Card Analysis KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Asset & Strike Movement */}
            <div className="bg-[#121216] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  ASSET PRICE MOVEMENT
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Open Strike:</span>
                  <span className="text-sm font-bold text-white">{formatPrice(round.openPrice)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Close Price:</span>
                  <span className="text-sm font-bold text-white">{formatPrice(round.closePrice)}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between">
                <span className="font-['Epilogue'] text-[10px] font-semibold text-[#a1a1aa]">NET DELTA:</span>
                <span
                  className={cx(
                    'font-mono text-xs font-black',
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
            <div className="bg-[#121216] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  PROBABILITY SHIFT
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Open Prob:</span>
                  <span className="text-sm font-bold text-white">
                    {formatProbability(round.openingProbability, 1)} (50¢)
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Final Odds:</span>
                  <span className="text-sm font-black text-[#22C55E]">
                    {formatProbability(round.finalProbability, 1)} YES
                  </span>
                </div>
              </div>

              {/* Dual Probability Bar */}
              <div className="mt-3 pt-2 border-t border-[#27272A]">
                <div className="h-2.5 w-full rounded-full bg-[#EF4444]/30 overflow-hidden flex border border-[#27272A]">
                  <div
                    className="h-full bg-[#22C55E] transition-all"
                    style={{ width: `${Math.min(98, Math.max(2, round.finalProbability * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#a1a1aa] mt-1">
                  <span>{(round.finalProbability * 100).toFixed(1)}% YES</span>
                  <span>{((1 - round.finalProbability) * 100).toFixed(1)}% NO</span>
                </div>
              </div>
            </div>

            {/* 3. Trading Volume & Activity */}
            <div className="bg-[#121216] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  TRADING ACTIVITY
                </span>
                <div className="mt-1 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Total Traded:</span>
                  <span className="text-sm font-black text-white">
                    {formatPoints(round.totalVolume, 0)} pts
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between font-mono">
                  <span className="text-xs text-[#a1a1aa]">Trade Count:</span>
                  <span className="text-sm font-bold text-white">{round.tradesCount} trades</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between text-xs font-mono">
                <span className="text-[#22C55E]">YES: {formatPoints(round.yesVolume, 0)}</span>
                <span className="text-[#71717a]">|</span>
                <span className="text-[#EF4444]">NO: {formatPoints(round.noVolume, 0)}</span>
              </div>
            </div>

            {/* 4. Accuracy & Calibration Verdict */}
            <div className="bg-[#121216] border border-[#27272A] rounded-xl p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-['Epilogue'] text-[10px] font-bold text-[#a1a1aa] uppercase tracking-wider block">
                  CALIBRATION & ACCURACY
                </span>
                <div className="mt-1 font-['Epilogue'] text-xs font-bold text-white leading-tight">
                  {round.calibration.verdict}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between font-mono text-xs">
                <span className="text-[#a1a1aa] text-[10px] font-['Epilogue']">Brier Score:</span>
                <span className="font-bold text-[#38BDF8]">
                  {round.calibration.brierScore != null ? round.calibration.brierScore : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Historical Probability Movement Chart */}
          <div className="bg-[#121216] border border-[#27272A] rounded-xl p-4 flex flex-col gap-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#22C55E]">timeline</span>
                YES / NO PROBABILITY MOVEMENT (HISTORICAL PROGRESSION)
              </span>
              <span className="font-mono text-xs text-[#a1a1aa]">
                {round.probabilityTimeline.length} data points recorded
              </span>
            </div>

            <ProbabilityHistoryChart timeline={round.probabilityTimeline} />
          </div>

          {/* Participant Performance & Payouts */}
          <div className="bg-[#121216] border border-[#27272A] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#27272A]/80 pb-2.5">
              <span className="font-['Epilogue'] text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#F59E0B]">military_tech</span>
                PARTICIPANT PERFORMANCE & PAYOUTS
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-[#a1a1aa]">
                  Unique Traders: <strong className="text-white">{round.uniqueParticipants}</strong>
                </span>
                <span className="text-[#a1a1aa]">
                  Total Payout: <strong className="text-[#22C55E]">{formatPoints(round.totalPayout, 0)} pts</strong>
                </span>
              </div>
            </div>

            {round.topPerformers.length === 0 ? (
              <div className="py-4 text-center text-xs text-[#a1a1aa] font-mono">
                No participant predictions recorded for this round.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#27272A] text-[#a1a1aa] font-['Epilogue'] uppercase text-[10px]">
                      <th className="py-2 px-2">Participant</th>
                      <th className="py-2 px-2">Shares Acquired</th>
                      <th className="py-2 px-2">Points Staked</th>
                      <th className="py-2 px-2">Payout Won</th>
                      <th className="py-2 px-2 text-right">Net PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#27272A]/60">
                    {round.topPerformers.map((performer, idx) => (
                      <tr key={performer.userId} className="hover:bg-[#18181e] transition-colors">
                        <td className="py-2.5 px-2 flex items-center gap-2">
                          <span className="text-[#71717a] font-bold w-4 text-center">#{idx + 1}</span>
                          <span className="font-['Geist'] font-bold text-white truncate max-w-[160px]">
                            {performer.name}
                          </span>
                          {performer.isBot && (
                            <span className="px-1.5 py-0.2 rounded bg-[#27272A] text-[9px] text-[#a1a1aa] font-['Epilogue']">
                              BOT
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          {performer.sharesYes > 0 && (
                            <span className="text-[#22C55E] font-bold mr-2">
                              {performer.sharesYes.toFixed(1)} YES
                            </span>
                          )}
                          {performer.sharesNo > 0 && (
                            <span className="text-[#EF4444] font-bold">
                              {performer.sharesNo.toFixed(1)} NO
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-white">
                          {formatPoints(performer.cost, 0)} pts
                        </td>
                        <td className="py-2.5 px-2 text-[#F59E0B] font-bold">
                          {formatPoints(performer.payout, 0)} pts
                        </td>
                        <td
                          className={cx(
                            'py-2.5 px-2 text-right font-black',
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
      <div className="h-32 flex items-center justify-center text-xs text-[#71717a] font-mono">
        No trades in this round yet
      </div>
    );
  }

  const width = 800;
  const height = 140;
  const padding = 20;

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
        className="w-full h-32 sm:h-36 overflow-visible select-none"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.25" />
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
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <text
          x={width - padding + 5}
          y={baselineY + 4}
          fill="#71717a"
          fontSize="10"
          fontFamily="monospace"
        >
          50%
        </text>

        {/* 80% and 20% guide lines */}
        <line
          x1={padding}
          y1={getY(0.8)}
          x2={width - padding}
          y2={getY(0.8)}
          stroke="#27272A"
          strokeDasharray="2 4"
          strokeWidth="1"
        />
        <text
          x={width - padding + 5}
          y={getY(0.8) + 4}
          fill="#52525b"
          fontSize="9"
          fontFamily="monospace"
        >
          80%
        </text>

        <line
          x1={padding}
          y1={getY(0.2)}
          x2={width - padding}
          y2={getY(0.2)}
          stroke="#27272A"
          strokeDasharray="2 4"
          strokeWidth="1"
        />
        <text
          x={width - padding + 5}
          y={getY(0.2) + 4}
          fill="#52525b"
          fontSize="9"
          fontFamily="monospace"
        >
          20%
        </text>

        {/* Area fill */}
        <path d={fillD} fill="url(#probGradient)" />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#22C55E"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((pt, idx) => (
          <circle
            key={idx}
            cx={pt.x}
            cy={pt.y}
            r={idx === points.length - 1 ? 4 : 2.5}
            fill={pt.side === 'YES' ? '#22C55E' : pt.side === 'NO' ? '#EF4444' : '#ffffff'}
            stroke="#121216"
            strokeWidth="1.5"
          />
        ))}
      </svg>
    </div>
  );
}
