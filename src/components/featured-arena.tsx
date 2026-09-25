'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import type { DirectoryArena } from '@/components/arena-directory';
import { StatusPill } from '@/components/ui';
import { cx, formatProbability } from '@/lib/format';
import type { RoundPayload } from '@/lib/realtime/events';

const CandleChart = dynamic(
  () => import('@/components/arena/candle-chart').then((m) => m.CandleChart),
  {
    ssr: false,
    loading: () => <div className="h-[168px] animate-pulse rounded-lg bg-ink-800" />,
  },
);

interface StateShape {
  round: RoundPayload | null;
}

/**
 * Hero market demonstration, backed by real platform data: the first LIVE
 * arena (else the first LOBBY one), its live YES probability from the public
 * state endpoint, and its asset's real price history. Honest empty state when
 * nothing is open — never a fabricated market.
 */
export function FeaturedArena() {
  const [arena, setArena] = useState<DirectoryArena | null>(null);
  const [round, setRound] = useState<RoundPayload | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/arenas', { cache: 'no-store' });
        if (!res.ok) return;
        const data: { arenas: DirectoryArena[] } = await res.json();
        const pick =
          data.arenas.find((a) => a.status === 'LIVE') ??
          data.arenas.find((a) => a.status === 'LOBBY') ??
          null;
        if (cancelled || !pick) {
          if (!cancelled) setLoaded(true);
          return;
        }
        if (!cancelled) {
          setArena(pick);
          setLoaded(true);
        }
        try {
          const state: StateShape = await (
            await fetch(`/api/arenas/${encodeURIComponent(pick.code)}/state`, { cache: 'no-store' })
          ).json();
          if (!cancelled && state?.round) setRound(state.round);
        } catch {
          // Probability is a bonus — the card stands without it.
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };

    void load();
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 20_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!loaded) {
    return <div className="h-[380px] animate-pulse rounded-xl border border-line bg-ink-900" aria-hidden />;
  }

  if (!arena) {
    return (
      <div className="flex h-full min-h-[380px] flex-col justify-between rounded-xl border border-dashed border-line-strong bg-ink-900 p-6">
        <div>
          <span className="label">Live demo</span>
          <h3 className="mt-2 text-xl font-extrabold tracking-tight text-fg">
            The floor is quiet right now
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            No arenas are open at this moment. Organizers spin them up in about a
            minute — each round asks one question: does the candle close green?
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/signup" className="btn-primary w-full text-sm">
            Create an arena
          </Link>
          <Link href="/markets" className="btn-secondary w-full text-sm">
            Browse markets
          </Link>
        </div>
      </div>
    );
  }

  const priceYes = round?.priceYes ?? 0.5;
  const live = arena.status === 'LIVE' && round?.status === 'TRADING';

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-ink-900 shadow-elevated">
      {/* Terminal window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-ink-950 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-no/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-yes/60" />
        </span>
        <span className="truncate font-mono text-[11px] text-fg-faint">
          arenas · {arena.code.toLowerCase()} · {arena.asset.toLowerCase()}/usdt
        </span>
        <span
          className={cx(
            'ml-auto flex shrink-0 items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider',
            live ? 'text-yes' : 'text-fg-faint',
          )}
        >
          <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-yes' : 'bg-fg-faint')} aria-hidden />
          {live ? 'Live' : arena.status === 'LOBBY' ? 'Open' : arena.status}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <StatusPill status={arena.status} />
          <span className="truncate text-sm font-bold text-fg">{arena.name}</span>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-fg-faint">
          <span className={cx('h-1.5 w-1.5 rounded-full', live ? 'animate-pulse bg-yes' : 'bg-fg-faint')} aria-hidden />
          {live ? 'Live' : arena.code}
        </span>
      </div>

      <div className="grid grid-cols-2 divide-x divide-line">
        <div className="px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-yes">Yes · closes up</div>
          <div className="tnum mt-1 text-[34px] font-extrabold leading-none tracking-tight text-yes">
            {formatProbability(priceYes, 0)}
          </div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-no">No · closes down</div>
          <div className="tnum mt-1 text-[34px] font-extrabold leading-none tracking-tight text-no">
            {formatProbability(1 - priceYes, 0)}
          </div>
        </div>
      </div>

      <div className="border-t border-line px-4 pb-2 pt-3">
        <div className="flex items-center justify-between px-1 pb-1.5 text-[11px] font-semibold text-fg-faint">
          <span className="font-mono uppercase">{arena.asset} · real price history</span>
          {round ? (
            <span className="tnum flex items-center gap-1">
              R{round.roundNumber} · <Arcs value={round.volume} decimals={0} /> vol
            </span>
          ) : null}
        </div>
        <CandleChart code={arena.code} height={168} candleLimit={60} />
      </div>

      <div className="flex gap-2 border-t border-line bg-ink-850 p-3">
        <Link href={`/arenas/${arena.code}`} className="btn-primary min-h-[42px] flex-1 text-sm">
          {arena.status === 'ENDED' ? 'View results' : 'Trade this market'}
        </Link>
        <Link
          href={`/arenas/${arena.code}/screen`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary min-h-[42px] px-4 text-sm"
          title="Projector view"
        >
          ↗
        </Link>
      </div>
    </div>
  );
}
