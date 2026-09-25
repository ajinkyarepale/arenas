'use client';

import { useEffect, useRef, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { cx, formatShares } from '@/lib/format';
import type { MarketPayload } from '@/lib/realtime/events';

type Fill = NonNullable<MarketPayload['lastTrade']> & { key: string };

const TAPE_LENGTH = 8;

/** Running strip of recent fills across the room, newest first. */
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
      <div className={cx('flex items-center px-1 text-fg-faint', isDisplay ? 'h-full text-lg' : 'h-9 text-[13px]', className)}>
        Waiting for the first fill…
      </div>
    );
  }

  return (
    <ol className={cx('flex flex-col', isDisplay ? 'gap-1.5' : 'gap-1', className)} aria-label="Recent trades">
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
  const yes = fill.side === 'YES';

  return (
    <li
      className={cx(
        'row-line flex items-center gap-2.5 py-1.5 font-mono',
        isDisplay ? 'text-[15px]' : 'text-xs',
        isNewest && 'animate-rise',
      )}
    >
      <span className={cx('w-8 shrink-0 text-[11px] font-extrabold', yes ? 'text-yes' : 'text-no')}>
        {fill.side}
      </span>
      <span className="min-w-0 flex-1 truncate font-sans font-medium text-fg-muted">{fill.displayName}</span>
      <span className="tnum shrink-0 text-fg-faint">{formatShares(fill.shares)} sh</span>
      <span className="tnum shrink-0 font-bold text-fg">
        <Arcs value={fill.cost} decimals={0} />
      </span>
    </li>
  );
}
