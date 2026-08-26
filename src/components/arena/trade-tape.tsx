'use client';

import { useEffect, useRef, useState } from 'react';

import { cx, formatPoints, formatShares } from '@/lib/format';
import type { MarketPayload } from '@/lib/realtime/events';

type Fill = NonNullable<MarketPayload['lastTrade']> & { key: string };

const TAPE_LENGTH = 8;

/**
 * The trade tape — a running strip of recent fills across the whole room.
 *
 * The data has been flowing over the socket since the trading engine shipped
 * (`MarketPayload.lastTrade`); this is the first component that renders it.
 * Follows the same ring-buffer-on-prop-change pattern as `ProbabilityTrace`
 * in probability.tsx rather than introducing a new one.
 */
export function TradeTape({
  lastTrade,
  variant = 'compact',
  className,
}: {
  lastTrade: MarketPayload['lastTrade'] | null | undefined;
  variant?: 'compact' | 'display';
  className?: string;
}) {
  const [fills, setFills] = useState<Fill[]>([]);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!lastTrade) return;
    const key = `${lastTrade.at}-${lastTrade.displayName}-${lastTrade.shares}`;
    if (seen.current === key) return;
    seen.current = key;
    setFills((prev) => [{ ...lastTrade, key }, ...prev].slice(0, TAPE_LENGTH));
  }, [lastTrade]);

  const isDisplay = variant === 'display';

  if (fills.length === 0) {
    return (
      <div
        className={cx(
          'flex items-center px-1 text-fg-faint',
          isDisplay ? 'h-full text-lg' : 'h-8 text-xs',
          className,
        )}
      >
        Waiting for the first fill…
      </div>
    );
  }

  return (
    <ol
      className={cx('flex flex-col', isDisplay ? 'gap-1.5' : 'gap-1', className)}
      aria-label="Recent trades"
    >
      {fills.map((fill, i) => (
        <TapeRow key={fill.key} fill={fill} variant={variant} isNewest={i === 0} />
      ))}
    </ol>
  );
}

function TapeRow({
  fill,
  variant,
  isNewest,
}: {
  fill: Fill;
  variant: 'compact' | 'display';
  isNewest: boolean;
}) {
  const isDisplay = variant === 'display';
  const isYes = fill.side === 'YES';

  return (
    <li
      className={cx(
        'flex items-center gap-2 rounded-md border font-mono',
        isDisplay ? 'px-3 py-1.5 text-base' : 'px-2 py-1 text-[11px]',
        isYes ? 'border-yes/25 bg-yes/[0.06]' : 'border-no/25 bg-no/[0.06]',
        isNewest && 'animate-rise',
      )}
    >
      <span
        className={cx('shrink-0 font-bold', isYes ? 'text-yes' : 'text-no')}
        aria-hidden
      >
        {isYes ? '▲' : '▼'}
      </span>
      <span className="min-w-0 flex-1 truncate text-fg-muted">{fill.displayName}</span>
      <span className={cx('tnum shrink-0 font-semibold', isYes ? 'text-yes' : 'text-no')}>
        {fill.side}
      </span>
      <span className="tnum shrink-0 text-fg-faint">{formatShares(fill.shares)}sh</span>
      <span className="tnum shrink-0 font-semibold text-fg">
        {formatPoints(fill.cost, 0)}pts
      </span>
    </li>
  );
}

