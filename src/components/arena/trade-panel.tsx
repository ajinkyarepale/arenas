'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  quoteByBudget,
  quoteByShares,
  sharesForBudget,
  type Quote,
} from '@/lib/lmsr';
import { formatPoints } from '@/lib/format';
import type { PositionSummary } from '@/lib/engine/trading';
import { Spinner } from '@/components/ui';

export interface TradePanelProps {
  code: string;
  balance: number;
  maxStakePerTrade: number;
  liquidityParamB: number;
  qYes: number;
  qNo: number;
  priceYes: number;
  position: PositionSummary | null;
  tradingOpen: boolean;
  disabledReason?: string;
  tradesPerMinuteLimit?: number;
  onFilled: () => void;
}

const QUICK_STAKES = [25, 50, 100];
const QUICK_SHARES = [10, 25, 50];
const DEFAULT_STAKE = 25;

export function TradePanel({
  code,
  balance,
  maxStakePerTrade,
  liquidityParamB,
  qYes,
  qNo,
  priceYes,
  position,
  tradingOpen,
  disabledReason,
  tradesPerMinuteLimit = 0,
  onFilled,
}: TradePanelProps) {
  const ceiling = Math.max(0, Math.min(maxStakePerTrade, Math.floor(balance)));
  const [mode, setMode] = useState<'POINTS' | 'SHARES'>('POINTS');
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');

  // Input states
  const [pointsInput, setPointsInput] = useState(() => Math.min(DEFAULT_STAKE, Math.max(1, ceiling)));
  const [sharesInput, setSharesInput] = useState<number>(30);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pYes = Math.max(0.01, Math.min(0.99, priceYes));
  const pNo = 1 - pYes;

  // Maximum shares affordable with the current ceiling
  const maxSharesAffordable = useMemo(() => {
    if (ceiling <= 0) return 0;
    try {
      return sharesForBudget({ qYes, qNo }, selectedSide, ceiling, liquidityParamB);
    } catch {
      return 0;
    }
  }, [qYes, qNo, selectedSide, ceiling, liquidityParamB]);

  useEffect(() => {
    if (ceiling > 0) {
      setPointsInput((current) => Math.max(1, Math.min(current, ceiling)));
      setSharesInput((current) => Math.max(1, Math.min(current, Math.max(1, Math.floor(maxSharesAffordable)))));
    }
  }, [ceiling, maxSharesAffordable]);

  // Derived quotes based on active mode
  const { quote, effectiveStake, effectiveShares } = useMemo(() => {
    if (ceiling <= 0) {
      return { quote: null, effectiveStake: 0, effectiveShares: 0 };
    }

    if (mode === 'POINTS') {
      const stake = Math.max(1, Math.min(pointsInput, ceiling));
      try {
        const q = quoteByBudget({ qYes, qNo }, selectedSide, stake, liquidityParamB);
        return { quote: q, effectiveStake: stake, effectiveShares: q.shares };
      } catch {
        return { quote: null, effectiveStake: stake, effectiveShares: 0 };
      }
    } else {
      // Shares Mode: Auto-cap requested shares to max affordable if over ceiling
      const desiredShares = Math.max(0.01, sharesInput);
      const cappedShares = maxSharesAffordable > 0 ? Math.min(desiredShares, maxSharesAffordable) : desiredShares;
      try {
        const q = quoteByShares({ qYes, qNo }, selectedSide, cappedShares, liquidityParamB);
        return { quote: q, effectiveStake: Math.min(q.cost, ceiling), effectiveShares: cappedShares };
      } catch {
        return { quote: null, effectiveStake: 0, effectiveShares: 0 };
      }
    }
  }, [mode, pointsInput, sharesInput, ceiling, maxSharesAffordable, qYes, qNo, selectedSide, liquidityParamB]);

  // Binary LMSR: 1 winning share pays 1 point
  const potentialPayout = effectiveShares * 1;
  const isZeroBalance = balance <= 0;

  const executeTrade = async () => {
    if (!tradingOpen || isZeroBalance || pending || effectiveStake <= 0) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${code}/trade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          side: selectedSide,
          stake: effectiveStake,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Prediction submission failed');
      }

      onFilled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Prediction failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col gap-5 font-['Geist'] text-xs">
      {/* Header: Mode Toggle & Rule Badge */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        {/* Mode Selector */}
        <div className="inline-flex rounded-lg bg-[#141414] p-0.5 border border-[#27272A]">
          <button
            type="button"
            onClick={() => setMode('POINTS')}
            className={`px-3 py-1 rounded-md font-['Epilogue'] text-[11px] font-bold transition-all ${
              mode === 'POINTS'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#c4c7c8] hover:text-white'
            }`}
          >
            By Points
          </button>
          <button
            type="button"
            onClick={() => setMode('SHARES')}
            className={`px-3 py-1 rounded-md font-['Epilogue'] text-[11px] font-bold transition-all ${
              mode === 'SHARES'
                ? 'bg-white text-black shadow-sm'
                : 'text-[#c4c7c8] hover:text-white'
            }`}
          >
            By Shares
          </button>
        </div>

        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] text-white font-['Epilogue'] text-[10px] font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          {tradesPerMinuteLimit > 0
            ? `${tradesPerMinuteLimit}/min`
            : 'Live Market'}
        </span>
      </div>

      {/* Live Odds Meter */}
      <div>
        <div className="flex justify-between font-['Epilogue'] text-sm font-bold mb-2">
          <div className="text-[#22C55E] flex items-center gap-1">
            <span>{Math.round(pYes * 100)}¢</span>
            <span className="text-xs text-[#22C55E]">YES</span>
          </div>
          <div className="text-[#EF4444] flex items-center gap-1">
            <span className="text-xs text-[#EF4444]">NO</span>
            <span>{Math.round(pNo * 100)}¢</span>
          </div>
        </div>

        <div className="h-2 w-full flex rounded-full overflow-hidden bg-[#201f1f]">
          <div className="h-full bg-[#22C55E] transition-all duration-300" style={{ width: `${pYes * 100}%` }} />
          <div className="h-full bg-[#EF4444] transition-all duration-300" style={{ width: `${pNo * 100}%` }} />
        </div>
      </div>

      {/* Zero Points Restriction Alert */}
      {isZeroBalance ? (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 flex flex-col gap-2 text-center">
          <div className="flex items-center justify-center gap-1.5 text-red-400 font-['Epilogue'] text-sm font-bold">
            <span className="material-symbols-outlined text-base">block</span>
            0 Points Remaining
          </div>
          <p className="text-xs text-[#c4c7c8]">
            You have 0 points left and cannot place further trades.
          </p>
        </div>
      ) : (
        <>
          {/* Side Toggle Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedSide('YES')}
              className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1 transition-all min-h-[44px] ${
                selectedSide === 'YES'
                  ? 'border-[#22C55E] bg-[#22C55E]/15 text-[#22C55E] font-bold ring-1 ring-[#22C55E]'
                  : 'border-[#27272A] bg-[#201f1f] text-[#c4c7c8] hover:border-[#38383a]'
              }`}
            >
              <span className="font-['Epilogue'] text-sm">PREDICT YES</span>
              <span className="font-mono text-xs">{Math.round(pYes * 100)}¢ / share</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSide('NO')}
              className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1 transition-all min-h-[44px] ${
                selectedSide === 'NO'
                  ? 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444] font-bold ring-1 ring-[#EF4444]'
                  : 'border-[#27272A] bg-[#201f1f] text-[#c4c7c8] hover:border-[#38383a]'
              }`}
            >
              <span className="font-['Epilogue'] text-sm">PREDICT NO</span>
              <span className="font-mono text-xs">{Math.round(pNo * 100)}¢ / share</span>
            </button>
          </div>

          {/* Trade Amount Input (Points or Shares) */}
          {mode === 'POINTS' ? (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center font-['Epilogue'] text-xs text-[#c4c7c8]">
                <span>POINTS BUDGET</span>
                <span>
                  Available: <span className="text-white font-bold">{formatPoints(balance, 0)} pts</span>
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={ceiling}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(Math.max(1, Math.min(Number(e.target.value), ceiling)))}
                  className="w-full bg-[#141414] border border-[#27272A] rounded-xl px-4 py-3 text-white font-mono text-base font-bold focus:outline-none focus:border-[#22C55E] pr-14 min-h-[44px]"
                />
                <span className="absolute right-4 top-3.5 text-[#8e9192] font-mono text-xs">PTS</span>
              </div>

              <div className="flex gap-2">
                {QUICK_STAKES.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPointsInput(Math.min(amt, ceiling))}
                    disabled={amt > ceiling}
                    className="flex-1 py-2 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed font-['Epilogue'] text-xs font-semibold text-white transition-colors min-h-[36px]"
                  >
                    +{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPointsInput(ceiling)}
                  className="flex-1 py-2 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] font-['Epilogue'] text-xs font-semibold text-[#22C55E] transition-colors min-h-[36px]"
                >
                  MAX
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center font-['Epilogue'] text-xs text-[#c4c7c8]">
                <span>TARGET SHARES</span>
                <span>
                  Max Affordable: <span className="text-white font-bold">{Math.floor(maxSharesAffordable)} sh</span>
                </span>
              </div>

              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, Math.floor(maxSharesAffordable))}
                  value={sharesInput}
                  onChange={(e) => setSharesInput(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#141414] border border-[#27272A] rounded-xl px-4 py-3 text-white font-mono text-base font-bold focus:outline-none focus:border-[#22C55E] pr-14 min-h-[44px]"
                />
                <span className="absolute right-4 top-3.5 text-[#8e9192] font-mono text-xs">SHARES</span>
              </div>

              <div className="flex gap-2">
                {QUICK_SHARES.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setSharesInput(Math.min(amt, Math.max(1, Math.floor(maxSharesAffordable))))}
                    disabled={amt > maxSharesAffordable}
                    className="flex-1 py-2 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed font-['Epilogue'] text-xs font-semibold text-white transition-colors min-h-[36px]"
                  >
                    +{amt} sh
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSharesInput(Math.max(1, Math.floor(maxSharesAffordable)))}
                  className="flex-1 py-2 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] font-['Epilogue'] text-xs font-semibold text-[#22C55E] transition-colors min-h-[36px]"
                >
                  MAX
                </button>
              </div>
            </div>
          )}

          {/* Outcome & Margin Summary */}
          <div className="bg-[#141414] rounded-xl p-3.5 border border-[#27272A] flex flex-col gap-2 font-['Epilogue'] text-xs">
            <div className="flex justify-between text-[#c4c7c8]">
              <span>REQUIRED MARGIN</span>
              <span className="text-white font-mono font-semibold">
                {effectiveStake.toFixed(0)} pts
              </span>
            </div>
            <div className="flex justify-between text-[#c4c7c8]">
              <span>ESTIMATED FILL</span>
              <span className="text-white font-mono">
                {effectiveShares.toFixed(1)} shares
              </span>
            </div>
            <div className="flex justify-between text-[#c4c7c8]">
              <span>POTENTIAL PAYOUT (IF {selectedSide})</span>
              <span className="text-[#22C55E] font-bold font-mono">
                {potentialPayout.toFixed(0)} pts
              </span>
            </div>
            <div className="flex justify-between text-[#c4c7c8]">
              <span>EST. MAX RETURN</span>
              <span className="text-white font-bold">
                {effectiveStake > 0 ? `+${((potentialPayout / effectiveStake - 1) * 100).toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>

          {error ? (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 text-xs">
              {error}
            </div>
          ) : null}

          {/* Submit Button */}
          <button
            type="button"
            onClick={executeTrade}
            disabled={!tradingOpen || pending || effectiveStake <= 0 || isZeroBalance}
            className={`w-full py-3.5 rounded-full font-['Epilogue'] text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 min-h-[44px] ${
              !tradingOpen || isZeroBalance
                ? 'bg-[#201f1f] text-[#8e9192] border border-[#27272A] cursor-not-allowed'
                : selectedSide === 'YES'
                  ? 'bg-[#22C55E] text-black hover:bg-[#1ea750] shadow-[#22C55E]/20'
                  : 'bg-[#EF4444] text-white hover:bg-[#dc2626] shadow-[#EF4444]/20'
            }`}
          >
            {pending ? (
              <>
                <Spinner className="w-4 h-4" />
                <span>Confirming Order...</span>
              </>
            ) : !tradingOpen ? (
              <span>{disabledReason || 'Trading Closed'}</span>
            ) : isZeroBalance ? (
              <span>0 Points Available</span>
            ) : mode === 'POINTS' ? (
              <span>PREDICT {selectedSide} (≈{effectiveShares.toFixed(1)} sh)</span>
            ) : (
              <span>PREDICT {selectedSide} ({effectiveStake.toFixed(0)} pts margin)</span>
            )}
          </button>
        </>
      )}
    </div>
  );
}
