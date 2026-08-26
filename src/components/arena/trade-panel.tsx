'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  costOfShares,
  quoteByBudget,
  quoteByShares,
  sharesForBudget,
  quantiseShares,
  type Quote,
} from '@/lib/lmsr';
import { cx, formatPoints, formatProbability, formatShares } from '@/lib/format';
import type { PositionSummary } from '@/lib/engine/trading';
import { Spinner } from '@/components/ui';

/**
 * The trading control.
 *
 * Mobile-first and thumb-first: the stake row and the two buy buttons sit at the
 * bottom of the screen where a thumb reaches, every target clears 44px, and the
 * quick-stake chips exist so nobody has to use a phone keyboard mid-round.
 *
 * The quote shown before you commit is computed with the same LMSR module the
 * server prices with, against the book state the socket last delivered. It is
 * an estimate — the server re-prices against the real book and can fill you
 * slightly differently if someone got there first — so it is labelled as one.
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
const QUICK_SHARES = [10, 25, 50, 100];
const DEFAULT_SHARES = 25;

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
  const [mode, setMode] = useState<BuyMode>('stake');
  const [stake, setStake] = useState(() => Math.min(DEFAULT_STAKE, ceiling));
  const [shares, setShares] = useState(DEFAULT_SHARES);
  const [pending, setPending] = useState<'YES' | 'NO' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  // Whether the participant has chosen a stake themselves. Until they have, we
  // are free to move it to the default as their real balance arrives.
  const [touched, setTouched] = useState(false);

  const chooseStake = (value: number) => {
    setTouched(true);
    setStake(value);
  };

  const chooseShares = (value: number) => {
    setShares(Math.max(0, value));
  };

  // Keep the stake inside what the participant can actually afford.
  //
  // The panel first renders before the balance snapshot has loaded, so `ceiling`
  // starts at 1. Clamping alone would pin the stake there permanently once the
  // real balance arrived, so an untouched stake is re-derived from the default
  // instead; a stake the participant chose is only ever clamped downward.
  useEffect(() => {
    setStake((current) =>
      touched
        ? Math.max(1, Math.min(current, ceiling))
        : Math.max(1, Math.min(DEFAULT_STAKE, ceiling)),
    );
  }, [ceiling, touched]);

  // In "shares" mode, buying `shares` of a side costs more than `shares` of
  // the other whenever the book is imbalanced — each side is quoted and
  // margin-capped independently against the same desired share count.
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
      const quoteSide = (side: 'YES' | 'NO'): Quote => {
        const rawCost = desired === 0 ? 0 : costOfShares(book, side, desired, liquidityParamB);
        if (rawCost <= ceiling) {
          return quoteByShares(book, side, desired, liquidityParamB);
        }
        // Desired shares would need more margin than the participant has —
        // cap at the most shares their ceiling actually affords.
        const affordable = quantiseShares(sharesForBudget(book, side, ceiling, liquidityParamB));
        return quoteByShares(book, side, affordable, liquidityParamB);
      };
      return { YES: quoteSide('YES'), NO: quoteSide('NO') };
    } catch {
      return null;
    }
  }, [qYes, qNo, stake, shares, mode, ceiling, liquidityParamB]);

  const canTrade = tradingOpen && balance >= 1 && !pending;

  const submit = async (side: 'YES' | 'NO') => {
    if (!canTrade) return;

    /**
     * Each mode sends what the participant actually asked for.
     *
     * A share order posts the share count, never a locally-computed cost: the
     * book can move between the quote and the fill, and converting here would
     * silently turn "buy 50 shares" into "spend what 50 shares cost a moment
     * ago", filling a different size than the one on screen. The server
     * re-prices the share count against the live book instead.
     */
    const payload =
      mode === 'stake'
        ? { side, stake: Math.max(1, Math.min(stake, ceiling)) }
        : { side, shares: quotes?.[side].shares ?? 0 };

    if ((payload.stake ?? payload.shares ?? 0) <= 0) {
      setError(
        mode === 'stake' ? 'Enter a stake first.' : 'Enter a number of shares first.',
      );
      return;
    }

    setPending(side);
    setError(null);

    try {
      const res = await fetch(`/api/arenas/${encodeURIComponent(code)}/trade`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? 'That trade did not go through.');
        return;
      }

      setFlash(
        `Filled ${formatShares(body.trade.shares)} ${side} at ${formatProbability(
          body.trade.priceAtFill,
        )}`,
      );
      onFilled();
    } catch {
      setError('Network problem — your trade was not placed.');
    } finally {
      setPending(null);
    }
  };

  // Clear the fill confirmation after a moment so it does not linger into the
  // next round.
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(timer);
  }, [flash]);

  const hasPosition =
    position !== null && (position.yesShares > 0 || position.noShares > 0);

  return (
    <div className="flex flex-col gap-3">
      <LivePriceTicker priceYes={priceYes} />

      <div className="flex gap-2">
        <ModeButton
          label="By points"
          active={mode === 'stake'}
          onClick={() => setMode('stake')}
        />
        <ModeButton
          label="By shares"
          active={mode === 'shares'}
          onClick={() => setMode('shares')}
        />
      </div>

      {mode === 'stake' ? (
        <div className="panel-tight p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="label">Stake</span>
            <span className="tnum text-xs text-fg-faint">
              max {formatPoints(ceiling, 0)} pts
            </span>
          </div>

          <div className="mt-2 flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Decrease stake"
              onClick={() => chooseStake(Math.max(1, stake - 5))}
              className="btn-secondary !min-w-[52px] !px-0 text-xl"
            >
              −
            </button>

            <label className="relative flex-1">
              <span className="sr-only">Stake in points</span>
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
                className="field tnum h-full text-center !text-2xl font-bold"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-fg-faint">
                pts
              </span>
            </label>

            <button
              type="button"
              aria-label="Increase stake"
              onClick={() => chooseStake(Math.min(ceiling, stake + 5))}
              className="btn-secondary !min-w-[52px] !px-0 text-xl"
            >
              +
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            {QUICK_STAKES.filter((amount) => amount <= ceiling).map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => chooseStake(amount)}
                className={cx(
                  'btn min-w-0 flex-1 !min-h-[44px] !px-2 border text-sm',
                  stake === amount
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-line-strong bg-ink-800 text-fg-muted',
                )}
              >
                {amount}
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseStake(ceiling)}
              className={cx(
                'btn min-w-0 flex-1 !min-h-[44px] !px-2 border text-sm',
                stake === ceiling
                  ? 'border-accent bg-accent/15 text-accent'
                  : 'border-line-strong bg-ink-800 text-fg-muted',
              )}
            >
              Max
            </button>
          </div>

          <input
            type="range"
            min={1}
            max={ceiling}
            value={Math.min(stake, ceiling)}
            onChange={(event) => chooseStake(Number.parseInt(event.target.value, 10))}
            className="mt-3 h-11 w-full cursor-pointer accent-accent"
            aria-label="Stake slider"
          />
        </div>
      ) : (
        <div className="panel-tight p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <span className="label">Shares to buy</span>
            <span className="tnum text-xs text-fg-faint">
              margin capped at {formatPoints(ceiling, 0)} pts
            </span>
          </div>

          <div className="mt-2 flex items-stretch gap-2">
            <button
              type="button"
              aria-label="Decrease shares"
              onClick={() => chooseShares(Math.max(0, shares - 5))}
              className="btn-secondary !min-w-[52px] !px-0 text-xl"
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
                  chooseShares(Number.isFinite(next) ? next : 0);
                }}
                className="field tnum h-full text-center !text-2xl font-bold"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-fg-faint">
                sh
              </span>
            </label>

            <button
              type="button"
              aria-label="Increase shares"
              onClick={() => chooseShares(shares + 5)}
              className="btn-secondary !min-w-[52px] !px-0 text-xl"
            >
              +
            </button>
          </div>

          <div className="mt-2 flex gap-2">
            {QUICK_SHARES.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => chooseShares(amount)}
                className={cx(
                  'btn min-w-0 flex-1 !min-h-[44px] !px-2 border text-sm',
                  shares === amount
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-line-strong bg-ink-800 text-fg-muted',
                )}
              >
                {amount}
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <MarginCell side="YES" quote={quotes?.YES ?? null} />
            <MarginCell side="NO" quote={quotes?.NO ?? null} />
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-sm text-no">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="rounded-lg border border-yes/40 bg-yes/10 px-3 py-2 text-sm text-yes">
          {flash}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <BuyButton
          side="YES"
          label="Closes UP"
          price={priceYes}
          shares={quotes?.YES.shares ?? 0}
          cost={quotes?.YES.cost ?? 0}
          mode={mode}
          disabled={!canTrade || (mode === 'shares' && (quotes?.YES.shares ?? 0) <= 0)}
          pending={pending === 'YES'}
          onClick={() => void submit('YES')}
        />
        <BuyButton
          side="NO"
          label="Closes DOWN"
          price={1 - priceYes}
          shares={quotes?.NO.shares ?? 0}
          cost={quotes?.NO.cost ?? 0}
          mode={mode}
          disabled={!canTrade || (mode === 'shares' && (quotes?.NO.shares ?? 0) <= 0)}
          pending={pending === 'NO'}
          onClick={() => void submit('NO')}
        />
      </div>

      {!tradingOpen ? (
        <p className="text-center text-sm text-fg-muted">
          {disabledReason ?? 'Trading is closed.'}
        </p>
      ) : balance < 1 ? (
        <p className="text-center text-sm text-warn">
          You are out of points for this arena.
        </p>
      ) : (
        <p className="text-center text-xs text-fg-faint">
          Estimated fill — the price moves with every trade, so the final price may differ
          slightly.
        </p>
      )}

      {/*
        Your existing position sits *below* the controls, not above them.

        It is reference material — you read it between trades — whereas the buy
        buttons are the thing you reach for with twenty seconds left. Putting
        the position first pushed those buttons off the first viewport on a
        phone, which is exactly what the layout ordering elsewhere in this
        screen exists to prevent.
      */}
      {hasPosition ? <PositionRow position={position} priceYes={priceYes} /> : null}
    </div>
  );
}

/** Both sides' live implied probability, side by side. */
function LivePriceTicker({ priceYes }: { priceYes: number }) {
  return (
    /*
      Compact on a phone, expanded from `sm` up.

      The panel above already carries the headline probability and the YES/NO
      split bar, so on a small screen this is a third rendering of the same
      number — and every pixel it spends here pushes the buy buttons closer to
      the fold. It stays because the two prices side by side is what you check
      before committing, but it earns only one line until there is room.
    */
    <div className="panel-tight grid grid-cols-2 divide-x divide-line p-2 sm:p-4">
      <div className="flex items-baseline justify-center gap-2 pr-2 sm:flex-col sm:items-center sm:gap-1">
        <span className="label text-yes">YES</span>
        <span className="tnum font-display text-xl font-bold text-yes glow-yes sm:text-3xl">
          {formatProbability(priceYes, 1)}
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-fg-faint sm:block">
          live
        </span>
      </div>
      <div className="flex items-baseline justify-center gap-2 pl-2 sm:flex-col sm:items-center sm:gap-1">
        <span className="label text-no">NO</span>
        <span className="tnum font-display text-xl font-bold text-no glow-no sm:text-3xl">
          {formatProbability(1 - priceYes, 1)}
        </span>
        <span className="hidden text-[10px] uppercase tracking-[0.12em] text-fg-faint sm:block">
          live
        </span>
      </div>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'btn min-h-[40px] flex-1 border text-sm font-semibold',
        active
          ? 'border-accent bg-accent/15 text-accent'
          : 'border-line-strong bg-ink-800 text-fg-muted',
      )}
    >
      {label}
    </button>
  );
}

function MarginCell({ side, quote }: { side: 'YES' | 'NO'; quote: Quote | null }) {
  const isYes = side === 'YES';
  const hasFill = quote && quote.shares > 0;
  // Shares pay 1 point each if the side wins, so the upside on this order is
  // simply its share count less what it cost.
  const profit = hasFill ? quote.shares - quote.cost : 0;

  return (
    <div
      className={cx(
        'rounded border px-3 py-2 text-center',
        isYes ? 'border-yes/30 bg-yes/[0.06]' : 'border-no/30 bg-no/[0.06]',
      )}
    >
      <div className={cx('text-xs font-bold', isYes ? 'text-yes' : 'text-no')}>{side}</div>
      <div className="tnum text-lg font-bold leading-tight">
        {hasFill ? formatPoints(quote.cost) : '—'}
      </div>
      <div className="text-[11px] text-fg-faint">required margin</div>
      {hasFill ? (
        <div className="mt-1 border-t border-line pt-1">
          <div className={cx('tnum text-xs font-semibold', isYes ? 'text-yes' : 'text-no')}>
            +{formatPoints(profit)}
          </div>
          <div className="text-[10px] text-fg-faint">if it wins</div>
        </div>
      ) : null}
    </div>
  );
}

function BuyButton({
  side,
  label,
  price,
  shares,
  cost,
  mode,
  disabled,
  pending,
  onClick,
}: {
  side: 'YES' | 'NO';
  label: string;
  price: number;
  shares: number;
  cost: number;
  mode: BuyMode;
  disabled: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  const isYes = side === 'YES';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={cx(
        // A tinted glass slab with an inner glow, per the concept's BUY YES /
        // BUY NO controls: the fill deepens toward the bottom so the button
        // reads as lit from within rather than painted flat.
        'relative flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-3 py-4 font-bold backdrop-blur-sm transition-all active:scale-[0.98]',
        // Comfortably past the 44px floor: this is the target people hit in a
        // hurry, one-handed, with a countdown running.
        'min-h-[88px]',
        isYes
          ? 'border-yes/45 bg-gradient-to-b from-yes/[0.08] to-yes/[0.18] text-yes enabled:hover:border-yes/70 enabled:hover:shadow-glow-yes'
          : 'border-no/45 bg-gradient-to-b from-no/[0.08] to-no/[0.18] text-no enabled:hover:border-no/70 enabled:hover:shadow-glow-no',
        (disabled || pending) && 'opacity-40',
      )}
    >
      {pending ? (
        <Spinner className="h-5 w-5" />
      ) : (
        <>
          <span
            className={cx(
              'font-display text-2xl font-bold uppercase leading-none tracking-[0.08em]',
              isYes ? 'glow-yes' : 'glow-no',
            )}
          >
            {isYes ? 'YES' : 'NO'}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] opacity-75">
            {label}
          </span>
          <span className="tnum mt-1 text-sm font-bold">{formatProbability(price)}</span>
          <span className="tnum font-mono text-[10px] opacity-65">
            {mode === 'stake'
              ? `≈ ${formatShares(shares)} sh`
              : `margin ${formatPoints(cost)} pts`}
          </span>
        </>
      )}
    </button>
  );
}

function PositionRow({
  position,
  priceYes,
}: {
  position: PositionSummary;
  priceYes: number;
}) {
  // Mark-to-market: what the position is worth if the round settled right now
  // at the current implied probability.
  const markValue = position.yesShares * priceYes + position.noShares * (1 - priceYes);
  const unrealised = markValue - position.totalStaked;

  /**
   * Settlement is not a forecast — every winning share pays exactly 1 point and
   * every losing share pays 0. So the outcome of this position is already known
   * for both branches, and showing the two exact numbers is far more useful
   * mid-round than a single mark-to-market figure.
   */
  const ifYes = position.yesShares - position.totalStaked;
  const ifNo = position.noShares - position.totalStaked;

  return (
    <div className="panel-tight p-3">
      <div className="flex items-center justify-between">
        <span className="label">Your position this round</span>
        <span
          className={cx(
            'tnum text-xs font-semibold',
            unrealised >= 0 ? 'text-yes' : 'text-no',
          )}
        >
          {unrealised >= 0 ? '+' : '−'}
          {formatPoints(Math.abs(unrealised))} mark
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <PositionCell
          side="YES"
          shares={position.yesShares}
          avgPrice={position.yesAvgPrice}
          cost={position.yesCost}
        />
        <PositionCell
          side="NO"
          shares={position.noShares}
          avgPrice={position.noAvgPrice}
          cost={position.noCost}
        />
      </div>

      <div className="mt-3 border-t border-line pt-2.5">
        <div className="label mb-1.5">Settles at</div>
        <div className="grid grid-cols-2 gap-2">
          <OutcomeRow label="If it closes UP" side="YES" pnl={ifYes} />
          <OutcomeRow label="If it closes DOWN" side="NO" pnl={ifNo} />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-faint">
          Exact — winning shares pay 1 point each, against {formatPoints(position.totalStaked)}{' '}
          pts staked.
        </p>
      </div>
    </div>
  );
}

/** One branch of settlement: what this position pays if the round goes that way. */
function OutcomeRow({
  label,
  side,
  pnl,
}: {
  label: string;
  side: 'YES' | 'NO';
  pnl: number;
}) {
  const up = pnl >= 0;
  return (
    <div
      className={cx(
        'rounded border px-2.5 py-1.5',
        side === 'YES' ? 'border-yes/25 bg-yes/[0.06]' : 'border-no/25 bg-no/[0.06]',
      )}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-faint">
        {label}
      </div>
      <div className={cx('tnum text-base font-bold', up ? 'text-yes' : 'text-no')}>
        {up ? '+' : '−'}
        {formatPoints(Math.abs(pnl))}
      </div>
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
  const isYes = side === 'YES';
  if (shares <= 0) {
    return (
      <div className="rounded-lg border border-line bg-ink-900 px-3 py-2 text-center text-xs text-fg-faint">
        No {side} position
      </div>
    );
  }
  return (
    <div
      className={cx(
        'rounded-lg border px-3 py-2',
        isYes ? 'border-yes/30 bg-yes/8' : 'border-no/30 bg-no/8',
      )}
    >
      <div className={cx('text-xs font-bold', isYes ? 'text-yes' : 'text-no')}>{side}</div>
      <div className="tnum text-lg font-bold leading-tight">{formatShares(shares)}</div>
      <div className="tnum text-[11px] text-fg-faint">
        avg {avgPrice !== null ? formatProbability(avgPrice) : '—'} · {formatPoints(cost)} pts
      </div>
    </div>
  );
}
