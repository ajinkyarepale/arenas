'use client';

import { useEffect, useMemo, useState } from 'react';

import { Arcs, ArcsSigned } from '@/components/arcs-mark';
import { Spinner } from '@/components/ui';
import {
  costOfShares,
  quantiseShares,
  quoteByBudget,
  quoteByShares,
  sharesForBudget,
  type Quote,
} from '@/lib/lmsr';
import { cx, formatPoints, formatProbability, formatShares } from '@/lib/format';
import type { PositionSummary } from '@/lib/engine/trading';

/**
 * Compact order-entry terminal.
 *
 * One integrated panel: outcome selector → amount → live order summary →
 * confirm. Every figure is an LMSR quote against the last known book and is
 * labelled an estimate until the backend confirms the fill.
 */

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

const QUICK_STAKES = [10, 25, 50, 100];
const DEFAULT_STAKE = 25;

type BuyMode = 'stake' | 'shares';

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
  const [side, setSide] = useState<'YES' | 'NO'>('YES');
  const [mode, setMode] = useState<BuyMode>('stake');
  const [stake, setStake] = useState(() => Math.min(DEFAULT_STAKE, ceiling));
  const [shares, setShares] = useState(25);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const chooseStake = (value: number) => {
    setTouched(true);
    setStake(value);
  };

  useEffect(() => {
    setStake((current) =>
      touched
        ? Math.max(1, Math.min(current, ceiling))
        : Math.max(1, Math.min(DEFAULT_STAKE, ceiling)),
    );
  }, [ceiling, touched]);

  const quotes = useMemo(() => {
    const book = { qYes, qNo };
    try {
      if (mode === 'stake') {
        const safeStake = Math.max(1, Math.min(stake, ceiling));
        return {
          YES: quoteByBudget(book, 'YES', safeStake, liquidityParamB),
          NO: quoteByBudget(book, 'NO', safeStake, liquidityParamB),
        };
      }
      const desired = Math.max(0, shares);
      const quoteSide = (s: 'YES' | 'NO'): Quote => {
        const rawCost = desired === 0 ? 0 : costOfShares(book, s, desired, liquidityParamB);
        if (rawCost <= ceiling) return quoteByShares(book, s, desired, liquidityParamB);
        const affordable = quantiseShares(sharesForBudget(book, s, ceiling, liquidityParamB));
        return quoteByShares(book, s, affordable, liquidityParamB);
      };
      return { YES: quoteSide('YES'), NO: quoteSide('NO') };
    } catch {
      return null;
    }
  }, [qYes, qNo, stake, shares, mode, ceiling, liquidityParamB]);

  const quote = quotes?.[side] ?? null;
  const canTrade = tradingOpen && balance >= 1 && !pending;
  const isYes = side === 'YES';

  const submit = async () => {
    if (!canTrade) return;
    const payload =
      mode === 'stake'
        ? { side, stake: Math.max(1, Math.min(stake, ceiling)) }
        : { side, shares: quote?.shares ?? 0 };

    if ((payload.stake ?? payload.shares ?? 0) <= 0) {
      setError(mode === 'stake' ? 'Enter an amount first.' : 'Enter a share quantity first.');
      return;
    }

    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/trade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? 'That order did not go through.');
        return;
      }

      setFlash(
        `Bought ${formatShares(body.trade.shares)} ${side} @ ${formatProbability(body.trade.priceAtFill)}`,
      );
      onFilled();
    } catch {
      setError('Network problem — your order was not placed.');
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  const hasPosition = position !== null && (position.yesShares > 0 || position.noShares > 0);
  const profit = quote && quote.shares > 0 ? quote.shares - quote.cost : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 1 — Outcome selector */}
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-ink-950 p-1" role="group" aria-label="Choose outcome">
        {(['YES', 'NO'] as const).map((s) => {
          const active = side === s;
          const p = s === 'YES' ? priceYes : 1 - priceYes;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              aria-pressed={active}
              className={cx(
                'flex items-center justify-between rounded-lg px-3.5 py-2.5 transition-all',
                active
                  ? s === 'YES'
                    ? 'bg-yes/15 text-yes shadow-[inset_0_0_0_1px_rgba(52,211,153,0.4)]'
                    : 'bg-no/15 text-no shadow-[inset_0_0_0_1px_rgba(251,113,133,0.4)]'
                  : 'text-fg-faint hover:bg-ink-850 hover:text-fg-muted',
              )}
            >
              <span className="text-[13px] font-extrabold tracking-wide">{s}</span>
              <span className="tnum text-[15px] font-extrabold">{formatProbability(p, 0)}</span>
            </button>
          );
        })}
      </div>

      {/* 2 — Amount */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg bg-ink-950 p-0.5" role="group" aria-label="Amount unit">
            {(['stake', 'shares'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={cx(
                  'rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
                  mode === m ? 'bg-ink-750 text-fg' : 'text-fg-faint hover:text-fg-muted',
                )}
              >
                {m === 'stake' ? 'Arcs' : 'Shares'}
              </button>
            ))}
          </div>
          <span className="tnum text-xs text-fg-faint">
            Max <Arcs value={ceiling} decimals={0} />
          </span>
        </div>

        {mode === 'stake' ? (
          <>
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                aria-label="Decrease amount"
                onClick={() => chooseStake(Math.max(1, stake - 5))}
                className="btn-secondary min-h-[52px] min-w-[52px] !px-0 text-xl"
              >
                −
              </button>
              <label className="relative flex-1">
                <span className="sr-only">Amount in Arcs</span>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={1}
                  max={ceiling}
                  value={stake}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    chooseStake(Number.isFinite(next) ? next : 1);
                  }}
                  onBlur={() => chooseStake(Math.max(1, Math.min(stake, ceiling)))}
                  className="field tnum h-[52px] text-center !text-xl font-extrabold"
                />
              </label>
              <button
                type="button"
                aria-label="Increase amount"
                onClick={() => chooseStake(Math.min(ceiling, stake + 5))}
                className="btn-secondary min-h-[52px] min-w-[52px] !px-0 text-xl"
              >
                +
              </button>
            </div>
            <div className="mt-2 grid grid-cols-5 gap-1.5">
              {QUICK_STAKES.filter((a) => a <= ceiling).map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => chooseStake(amount)}
                  className={cx(
                    'h-9 rounded-lg border text-[13px] font-bold transition-colors',
                    stake === amount
                      ? 'border-accent/50 bg-accent/15 text-accent-light'
                      : 'border-line bg-ink-950 text-fg-muted hover:border-line-strong',
                  )}
                >
                  {amount}
                </button>
              ))}
              <button
                type="button"
                onClick={() => chooseStake(ceiling)}
                className={cx(
                  'h-9 rounded-lg border text-[13px] font-bold transition-colors',
                  stake === ceiling
                    ? 'border-accent/50 bg-accent/15 text-accent-light'
                    : 'border-line bg-ink-950 text-fg-muted hover:border-line-strong',
                )}
              >
                Max
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Decrease shares"
              onClick={() => setShares(Math.max(0, shares - 5))}
              className="btn-secondary min-h-[52px] min-w-[52px] !px-0 text-xl"
            >
              −
            </button>
            <label className="relative flex-1">
              <span className="sr-only">Number of shares</span>
              <input
                type="number"
                inputMode="numeric"
                pattern="[0-9]*"
                min={0}
                value={shares}
                onChange={(event) => {
                  const next = Number.parseInt(event.target.value, 10);
                  setShares(Number.isFinite(next) ? next : 0);
                }}
                className="field tnum h-[52px] text-center !text-xl font-extrabold"
              />
            </label>
            <button
              type="button"
              aria-label="Increase shares"
              onClick={() => setShares(shares + 5)}
              className="btn-secondary min-h-[52px] min-w-[52px] !px-0 text-xl"
            >
              +
            </button>
          </div>
        )}
      </div>

      {/* 3 — Order summary */}
      <dl className="rounded-xl border border-line bg-ink-950 px-4 py-1 text-[13px]">
        <SummaryRow label={`Price · ${side}`} value={quote ? formatProbability(quote.avgPrice ?? (isYes ? priceYes : 1 - priceYes)) : '—'} />
        <SummaryRow label="Est. shares" value={quote && quote.shares > 0 ? formatShares(quote.shares) : '—'} />
        <SummaryRow label="Cost" value={quote ? <Arcs value={quote.cost} /> : '—'} />
        <SummaryRow
          label={`To win (${side} wins)`}
          value={quote && quote.shares > 0 ? <Arcs value={quote.shares} /> : '—'}
          strong
        />
        <div className="flex items-center justify-between border-t border-line py-2">
          <dt className="text-fg-faint">Profit if {side} wins</dt>
          <dd className={cx('tnum font-extrabold', profit >= 0 ? 'text-yes' : 'text-no')}>
            {quote && quote.shares > 0 ? (
              <Arcs value={profit} />
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>

      {error ? (
        <p role="alert" className="rounded-lg border border-no/30 bg-no/10 px-3 py-2 text-[13px] font-medium text-no">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p role="status" className="rounded-lg border border-yes/30 bg-yes/10 px-3 py-2 text-[13px] font-medium text-yes">
          {flash}
        </p>
      ) : null}

      {/* 4 — Confirm */}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!canTrade}
        className={cx(
          'flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-extrabold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40',
          isYes ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500',
        )}
      >
        {pending ? (
          <Spinner className="h-5 w-5" />
        ) : (
          <>
            Buy {side}
            <span className="tnum font-bold text-white/85">
              · {mode === 'stake' ? <Arcs value={Math.max(1, Math.min(stake, ceiling))} decimals={0} /> : `${formatShares(quote?.shares ?? 0)} sh`}
            </span>
          </>
        )}
      </button>

      {!tradingOpen ? (
        <p className="rounded-lg bg-ink-850 px-3 py-2 text-center text-[13px] font-medium text-fg-muted">
          {disabledReason ?? 'Trading is closed.'}
        </p>
      ) : balance < 1 ? (
        <p className="rounded-lg bg-warn/10 px-3 py-2 text-center text-[13px] font-medium text-warn">
          Out of Arcs for this arena.
        </p>
      ) : (
        <p className="text-center text-xs text-fg-faint">
          Estimate — the price moves with every fill; the backend confirms the final fill.
        </p>
      )}

      {hasPosition ? <PositionCard position={position} priceYes={priceYes} /> : null}
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-line/60 py-2 last:border-0">
      <dt className="text-fg-faint">{label}</dt>
      <dd className={cx('tnum', strong ? 'font-extrabold text-fg' : 'font-semibold text-fg-muted')}>{value}</dd>
    </div>
  );
}

function PositionCard({ position, priceYes }: { position: PositionSummary; priceYes: number }) {
  const markValue = position.yesShares * priceYes + position.noShares * (1 - priceYes);
  const unrealised = markValue - position.totalStaked;
  const ifYes = position.yesShares - position.totalStaked;
  const ifNo = position.noShares - position.totalStaked;

  return (
    <div className="rounded-xl border border-line bg-ink-950 p-3.5">
      <div className="flex items-center justify-between">
        <span className="label">Your position · this round</span>
        <span className={cx('text-xs font-bold', unrealised >= 0 ? 'text-yes' : 'text-no')}>
          <ArcsSigned value={unrealised} /> mark
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <PositionCell side="YES" shares={position.yesShares} avgPrice={position.yesAvgPrice} cost={position.yesCost} />
        <PositionCell side="NO" shares={position.noShares} avgPrice={position.noAvgPrice} cost={position.noCost} />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <OutcomeCell label="If UP" side="YES" pnl={ifYes} />
        <OutcomeCell label="If DOWN" side="NO" pnl={ifNo} />
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-1 text-[11px] leading-relaxed text-fg-faint">
        Exact at settle — winners pay <Arcs value={1} />/share against <Arcs value={position.totalStaked} /> staked.
      </p>
    </div>
  );
}

function PositionCell({
  side,
  shares,
  avgPrice,
  cost,
}: {
  side: 'YES' | 'NO';
  shares: number;
  avgPrice: number | null;
  cost: number;
}) {
  const yes = side === 'YES';
  if (shares <= 0) {
    return (
      <div className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-center text-xs text-fg-faint">
        No {side}
      </div>
    );
  }
  return (
    <div className={cx('rounded-lg border px-3 py-2', yes ? 'border-yes/25 bg-yes/[0.05]' : 'border-no/25 bg-no/[0.05]')}>
      <div className={cx('text-[11px] font-extrabold tracking-wide', yes ? 'text-yes' : 'text-no')}>{side} · {formatShares(shares)}</div>
      <div className="tnum mt-0.5 text-[11px] text-fg-faint">
        avg {avgPrice !== null ? formatProbability(avgPrice) : '—'} · <Arcs value={cost} />
      </div>
    </div>
  );
}

function OutcomeCell({ label, side, pnl }: { label: string; side: 'YES' | 'NO'; pnl: number }) {
  const up = pnl >= 0;
  return (
    <div className="rounded-lg border border-line bg-ink-900 px-2.5 py-1.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-fg-faint">{label}</div>
      <div className={cx('text-[15px] font-extrabold', up ? 'text-yes' : 'text-no')}>
        <ArcsSigned value={pnl} />
      </div>
    </div>
  );
}
