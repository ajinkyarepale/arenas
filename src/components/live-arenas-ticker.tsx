'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { formatPoints } from '@/lib/format';
import type { DirectoryArena } from '@/components/arena-directory';

/**
 * Quiet live strip: arenas actually open right now. Renders nothing when the
 * floor is empty rather than inventing activity.
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
        // Decorative — stay silent.
      }
    };

    void load();
    const timer = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const open = (arenas ?? []).filter((a) => a.status === 'LIVE' || a.status === 'LOBBY');
  if (open.length === 0) return null;

  const items = [...open, ...open];

  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-ink-900 py-2.5" aria-label="Arenas open right now">
      <div className="flex w-max animate-marquee items-center gap-8 whitespace-nowrap px-4 motion-reduce:animate-none">
        {items.map((arena, i) => (
          <Link
            key={`${arena.id}-${i}`}
            href={`/arenas/${arena.code}`}
            className="flex items-center gap-2 font-mono text-xs text-fg-muted transition-colors hover:text-fg"
          >
            <span
              className={arena.status === 'LIVE' ? 'h-1.5 w-1.5 animate-pulse rounded-full bg-yes' : 'h-1.5 w-1.5 rounded-full bg-accent'}
              aria-hidden
            />
            <span className="font-bold text-fg">{arena.code}</span>
            <span className="font-sans font-medium">{arena.name}</span>
            {arena.status === 'LIVE' ? (
              <span className="text-fg-faint">R{arena.currentRound}/{arena.totalRounds} live</span>
            ) : (
              <span className="text-fg-faint">
                <Arcs value={arena.startingBalance} decimals={0} /> start
              </span>
            )}
            <span className="text-fg-faint/40" aria-hidden>
              /
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
