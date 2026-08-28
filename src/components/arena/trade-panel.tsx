'use client';

import { useEffect, useMemo, useState } from 'react';

import { quoteByBudget, type Quote } from '@/lib/lmsr';
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
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
  const [stake, setStake] = useState(() => Math.min(DEFAULT_STAKE, Math.max(1, ceiling)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ceiling > 0) {
      setStake((current) => Math.max(1, Math.min(current, ceiling)));
    }
  }, [ceiling]);

  const pYes = Math.max(0.01, Math.min(0.99, priceYes));
  const pNo = 1 - pYes;

  const quote = useMemo<Quote | null>(() => {
    if (stake <= 0) return null;
    return quoteByBudget({ qYes, qNo }, selectedSide, stake, liquidityParamB);
  }, [qYes, qNo, liquidityParamB, selectedSide, stake]);

  const estShares = quote ? quote.shares : stake / (selectedSide === 'YES' ? pYes : pNo);
  const potentialPayout = estShares * 100;

  const isZeroBalance = balance <= 0;

  const executeTrade = async () => {
    if (!tradingOpen || isZeroBalance || pending || stake <= 0) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${code}/trade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          side: selectedSide,
          stake,
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
      {/* Prediction Rule Badge */}
      <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
        <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
          SUBMISSION RULE
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] text-white font-['Epilogue'] text-[10px] font-bold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
          {tradesPerMinuteLimit > 0
            ? `${tradesPerMinuteLimit} trades / min`
            : 'No Limit (balance > 0)'}
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
          <div className="h-full bg-[#22C55E] transition-all" style={{ width: `${pYes * 100}%` }} />
          <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${pNo * 100}%` }} />
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
              className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1 transition-all ${
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
              className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                selectedSide === 'NO'
                  ? 'border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444] font-bold ring-1 ring-[#EF4444]'
                  : 'border-[#27272A] bg-[#201f1f] text-[#c4c7c8] hover:border-[#38383a]'
              }`}
            >
              <span className="font-['Epilogue'] text-sm">PREDICT NO</span>
              <span className="font-mono text-xs">{Math.round(pNo * 100)}¢ / share</span>
            </button>
          </div>

          {/* Stake Input with Quick Buttons */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center font-['Epilogue'] text-xs text-[#c4c7c8]">
              <span>YOUR STAKE</span>
              <span>
                Available:{' '}
                <span className="text-white font-bold">{formatPoints(balance, 0)} pts</span>
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                min={1}
                max={ceiling}
                value={stake}
                onChange={(e) => setStake(Math.max(1, Math.min(Number(e.target.value), ceiling)))}
                className="w-full bg-[#141414] border border-[#27272A] rounded-xl px-4 py-3 text-white font-mono text-base font-bold focus:outline-none focus:border-[#22C55E] pr-14"
              />
              <span className="absolute right-4 top-3.5 text-[#8e9192] font-mono text-xs">PTS</span>
            </div>

            <div className="flex gap-2">
              {QUICK_STAKES.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setStake(Math.min(amt, ceiling))}
                  disabled={amt > ceiling}
                  className="flex-1 py-1.5 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] disabled:opacity-30 disabled:cursor-not-allowed font-['Epilogue'] text-xs font-semibold text-white transition-colors"
                >
                  +{amt}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStake(ceiling)}
                className="flex-1 py-1.5 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] font-['Epilogue'] text-xs font-semibold text-[#22C55E] transition-colors"
              >
                MAX
              </button>
            </div>
          </div>

          {/* Outcome Estimation Summary */}
          <div className="bg-[#141414] rounded-xl p-3.5 border border-[#27272A] flex flex-col gap-2 font-['Epilogue'] text-xs">
            <div className="flex justify-between text-[#c4c7c8]">
              <span>EST. SHARES</span>
              <span className="text-white font-mono">{estShares.toFixed(1)}</span>
            </div>
            <div className="flex justify-between text-[#c4c7c8]">
              <span>POTENTIAL PAYOUT</span>
              <span className="text-[#22C55E] font-bold font-mono">
                {potentialPayout.toFixed(0)} pts
              </span>
            </div>
            <div className="flex justify-between text-[#c4c7c8]">
              <span>MAX RETURN</span>
              <span className="text-white font-bold">
                {stake > 0 ? `+${((potentialPayout / stake - 1) * 100).toFixed(0)}%` : '0%'}
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
            disabled={!tradingOpen || pending || stake <= 0 || isZeroBalance}
            className={`w-full py-3.5 rounded-full font-['Epilogue'] text-sm font-bold tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 ${
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
            ) : (
              <span>SUBMIT {selectedSide} PREDICTION</span>
            )}
          </button>
        </>
      )}
    </div>
  );
}
