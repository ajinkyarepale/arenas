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
  onFilled,
}: TradePanelProps) {
  const ceiling = Math.max(1, Math.min(maxStakePerTrade, Math.floor(balance)));
  const [selectedSide, setSelectedSide] = useState<'YES' | 'NO'>('YES');
  const [stake, setStake] = useState(() => Math.min(DEFAULT_STAKE, ceiling));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStake((current) => Math.max(1, Math.min(current, ceiling)));
  }, [ceiling]);

  const pYes = Math.max(0.01, Math.min(0.99, priceYes));
  const pNo = 1 - pYes;

  const quote = useMemo<Quote | null>(() => {
    if (stake <= 0) return null;
    return quoteByBudget({ qYes, qNo }, selectedSide, stake, liquidityParamB);
  }, [qYes, qNo, liquidityParamB, selectedSide, stake]);

  const estShares = quote ? quote.shares : stake / (selectedSide === 'YES' ? pYes : pNo);
  const potentialPayout = estShares * 100;

  const executeTrade = async () => {
    if (!tradingOpen || pending || stake <= 0) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${code}/trades`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          outcome: selectedSide,
          mode: 'stake',
          budgetPoints: stake,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Order failed');
      }

      onFilled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="glass-panel p-6 border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-xl flex flex-col gap-5 font-['Geist'] text-xs">
      {/* Odds Meter */}
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

      {/* Side Toggle Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setSelectedSide('YES')}
          className={`py-3 rounded-lg border font-['Epilogue'] text-xs font-bold transition-all ${
            selectedSide === 'YES'
              ? 'bg-[#22C55E]/15 border-[#22C55E] text-[#22C55E]'
              : 'bg-[#201f1f] border-[#27272A] text-[#c4c7c8] hover:text-white'
          }`}
        >
          BUY YES
        </button>
        <button
          type="button"
          onClick={() => setSelectedSide('NO')}
          className={`py-3 rounded-lg border font-['Epilogue'] text-xs font-bold transition-all ${
            selectedSide === 'NO'
              ? 'bg-[#EF4444]/15 border-[#EF4444] text-[#EF4444]'
              : 'bg-[#201f1f] border-[#27272A] text-[#c4c7c8] hover:text-white'
          }`}
        >
          BUY NO
        </button>
      </div>

      {/* Amount Input */}
      <div>
        <div className="flex justify-between items-center mb-1.5 font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">
          <span>AMOUNT (PTS)</span>
          <span>Bal: {formatPoints(balance, 0)}</span>
        </div>
        <div className="relative">
          <input
            type="number"
            min={1}
            max={ceiling}
            value={stake}
            onChange={(e) => setStake(Math.max(1, Math.min(Number(e.target.value) || 0, ceiling)))}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-xl py-3 px-4 text-white font-['Epilogue'] text-sm font-bold focus:border-white focus:outline-none transition-colors"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-[#c4c7c8]">
            pts
          </span>
        </div>
      </div>

      {/* Quick Stake Preset Chips */}
      <div className="grid grid-cols-4 gap-2">
        {QUICK_STAKES.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => setStake(Math.min(amt, ceiling))}
            className="py-1.5 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] text-[#c4c7c8] hover:text-white font-['Epilogue'] text-xs transition-colors"
          >
            +{amt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStake(ceiling)}
          className="py-1.5 rounded-lg border border-[#27272A] bg-[#201f1f] hover:bg-[#2a2a2a] text-white font-['Epilogue'] text-xs font-bold transition-colors"
        >
          MAX
        </button>
      </div>

      {/* Quote Breakdown */}
      <div className="space-y-2 py-3 border-y border-[#27272A] font-['Epilogue'] text-xs">
        <div className="flex justify-between text-[#c4c7c8]">
          <span>EST. SHARES</span>
          <span className="text-white font-medium">{estShares.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-[#c4c7c8]">
          <span>SLIPPAGE</span>
          <span className="text-white font-medium">1.5%</span>
        </div>
        <div className="flex justify-between text-[#c4c7c8]">
          <span>POTENTIAL PAYOUT</span>
          <span className="text-[#22C55E] font-bold">{potentialPayout.toFixed(2)} pts</span>
        </div>
      </div>

      {error ? (
        <div className="text-xs text-red-400 p-2 rounded bg-red-950/20 border border-red-500/30">
          {error}
        </div>
      ) : null}

      {!tradingOpen ? (
        <div className="text-xs text-[#c4c7c8] text-center p-3 rounded-xl border border-[#27272A] bg-[#201f1f]">
          {disabledReason ?? 'Trading is currently closed.'}
        </div>
      ) : (
        <button
          type="button"
          disabled={pending || stake <= 0}
          onClick={executeTrade}
          className="w-full bg-white text-[#2f3131] font-['Epilogue'] text-sm font-bold rounded-full py-3.5 hover:bg-[#c6c6c7] transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          {pending ? <Spinner className="border-[#2f3131] border-t-transparent" /> : null}
          <span>{pending ? 'Executing...' : `Submit Buy ${selectedSide}`}</span>
        </button>
      )}
    </div>
  );
}
