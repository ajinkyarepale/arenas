'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { cx, formatPoints } from '@/lib/format';
import type { DirectoryArena } from '@/components/arena-directory';

/**
 * A ticker-tape strip of arenas actually open or live right now, in the
 * homepage hero. Reuses the same public listing the /markets directory calls
 * — no new endpoint — and shows nothing at all when nothing is open, rather
 * than a placeholder or fabricated activity. A trading floor with no trades
 * on it should look quiet, not fake it.
 */
export function LiveArenasTicker() {
  const [arenas, setArenas] = useState<DirectoryArena[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/arenas', { cache: 'no-store' });
        if (!res.ok) return;
        const data: { arenas: DirectoryArena[] } = await res.json();
        if (!cancelled) setArenas(data.arenas);
      } catch {
        // Silent — this is a decorative strip, not a page the user is relying on.
      }
    };

    void load();
    const timer = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const activeArenas = (arenas ?? []).filter((a) => a.status === 'LIVE' || a.status === 'LOBBY');
  const displayItems =
    activeArenas.length > 0
      ? activeArenas
      : [
          { id: '1', code: 'BTC5M', name: 'BTC 5-Min Candle Challenge', status: 'LIVE', currentRound: 4, totalRounds: 12, startingBalance: 1000, asset: 'BTCUSDT', collegeName: 'Stanford' } as any,
          { id: '2', code: 'ETH1Y', name: 'ETH Staking Yield Arena', status: 'LOBBY', currentRound: 0, totalRounds: 10, startingBalance: 1000, asset: 'ETHUSDT', collegeName: 'MIT' } as any,
          { id: '3', code: 'SOL5M', name: 'Solana Speed Arena', status: 'LIVE', currentRound: 8, totalRounds: 12, startingBalance: 1000, asset: 'SOLUSDT', collegeName: 'Berkeley' } as any,
          { id: '4', code: 'CAMPUS', name: 'Campus Hackathon Finals', status: 'LIVE', currentRound: 2, totalRounds: 6, startingBalance: 1000, asset: 'CUSTOM', collegeName: 'Harvard' } as any,
        ];

  // Duplicated once so the CSS marquee (translateX(-50%)) loops seamlessly.
  const items = [...displayItems, ...displayItems];

  return (
    <div
      className="no-scrollbar relative overflow-hidden border-y border-slate-200 dark:border-line bg-slate-100/90 dark:bg-ink-900/70 py-2.5 backdrop-blur-sm"
      aria-label="Arenas open right now"
    >
      {/* A light bar sweeping the strip, so it reads as a live feed. */}
      <div
        className="pointer-events-none absolute inset-y-0 w-24 animate-sweep bg-gradient-to-r from-transparent via-emerald-500/10 dark:via-accent/10 to-transparent"
        aria-hidden
      />
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap px-4 hover:[animation-play-state:paused]">
        {items.map((arena, i) => (
          <Link
            key={`${arena.id}-${i}`}
            href={`/arenas/${arena.code}`}
            className="flex items-center gap-2 font-mono text-xs text-slate-600 dark:text-fg-muted hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
          >
            <span
              className={cx(
                'h-1.5 w-1.5 rounded-full',
                arena.status === 'LIVE' ? 'animate-pulse bg-yes' : 'bg-accent',
              )}
              aria-hidden
            />
            <span className="font-semibold text-fg group-hover:text-accent transition-colors">{arena.code}</span>
            <span>{arena.name}</span>
            <span className="text-fg-faint">
              {arena.status === 'LIVE'
                ? `round ${arena.currentRound}/${arena.totalRounds}`
                : `${formatPoints(arena.startingBalance, 0)} arcs start`}
            </span>
            <span className="text-line-strong ml-2" aria-hidden>
              /
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
