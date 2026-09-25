'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { EmptyState, Panel, StatusPill } from '@/components/ui';
import { cx, formatDateTime, formatDuration, formatRelative } from '@/lib/format';

export interface DirectoryArena {
  id: string;
  code: string;
  name: string;
  description: string | null;
  host: string;
  asset: string;
  roundDurationSec: number;
  totalRounds: number;
  currentRound: number;
  startingBalance: number;
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'ENDED';
  scheduledFor: string | null;
  startedAt: string | null;
  endsAt: string | null;
  participantCount: number;
  joined: boolean;
}

type Filter = 'all' | 'LIVE' | 'LOBBY' | 'ENDED';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'LIVE', label: 'Live now' },
  { value: 'LOBBY', label: 'Upcoming' },
  { value: 'ENDED', label: 'Finished' },
];

/**
 * Public arena directory. Only LOBBY/LIVE/ENDED arenas are ever returned —
 * DRAFTs are excluded by the API itself, so organizers can prepare privately.
 * `compact` renders a headline-only grid for the homepage.
 */
export function ArenaDirectory({
  showJoinActions = false,
  compact = false,
}: {
  showJoinActions?: boolean;
  compact?: boolean;
}) {
  const [arenas, setArenas] = useState<DirectoryArena[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/arenas', { cache: 'no-store' });
        if (!res.ok) throw new Error('Could not load markets');
        const data: { arenas: DirectoryArena[] } = await res.json();
        if (!cancelled) {
          setArenas(data.arenas);
          setError(null);
        }
      } catch {
        if (!cancelled) setError('Could not load markets right now.');
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

  const visible = useMemo(() => {
    if (!arenas) return null;
    const needle = query.trim().toLowerCase();
    const list = arenas
      .filter((arena) => (filter === 'all' ? true : arena.status === filter))
      .filter((arena) =>
        needle
          ? [arena.name, arena.host, arena.asset, arena.code].join(' ').toLowerCase().includes(needle)
          : true,
      );
    return compact ? list.filter((a) => a.status !== 'ENDED').slice(0, 4) : list;
  }, [arenas, query, filter, compact]);

  return (
    <div className="flex flex-col gap-4">
      {!compact ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search markets</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search events, colleges, assets…"
              className="field"
              type="search"
            />
          </label>

          <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-lg border border-line bg-ink-900 p-1" role="tablist" aria-label="Filter by status">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={filter === option.value}
                onClick={() => setFilter(option.value)}
                className={cx(
                  'shrink-0 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors',
                  filter === option.value ? 'bg-ink-750 text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <Panel className="p-6 text-sm text-no">{error}</Panel>
      ) : visible === null ? (
        <div className={cx('grid gap-3', compact ? 'sm:grid-cols-2' : 'md:grid-cols-2')}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-ink-900" aria-hidden />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={compact ? 'No open arenas right now' : 'No markets found'}
          body={
            query || filter !== 'all'
              ? 'No markets match that filter. Try clearing the search.'
              : 'No arenas are open at the moment. Organizers spin them up in about a minute.'
          }
          action={{ href: '/signup', label: 'Create an arena' }}
        />
      ) : (
        <ul className={cx('grid gap-3', compact ? 'sm:grid-cols-2' : 'md:grid-cols-2')}>
          {visible.map((arena) => (
            <ArenaCard key={arena.id} arena={arena} showJoinActions={showJoinActions} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArenaCard({ arena, showJoinActions }: { arena: DirectoryArena; showJoinActions: boolean }) {
  const when =
    arena.status === 'LIVE'
      ? `Round ${arena.currentRound} of ${arena.totalRounds} · trading now`
      : arena.status === 'ENDED'
        ? `Finished ${formatRelative(arena.endsAt)}`
        : arena.scheduledFor
          ? formatDateTime(arena.scheduledFor)
          : 'Open for joining';

  return (
    <li>
      <Panel
        className={cx(
          'group flex h-full flex-col p-5 transition-colors hover:border-line-strong',
          arena.status === 'LIVE' && 'border-yes/25',
        )}
      >
        <div className="flex items-center gap-2">
          <StatusPill status={arena.status} />
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-faint">
            {arena.host} · {arena.asset}
          </span>
        </div>

        <h3 className="mt-2.5 text-[17px] font-bold tracking-tight text-fg transition-colors group-hover:text-accent-light">
          {arena.name}
        </h3>

        {arena.description ? <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fg-muted">{arena.description}</p> : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-fg-faint">
          <span>{arena.totalRounds} × {formatDuration(arena.roundDurationSec)}</span>
          <span aria-hidden>·</span>
          <Arcs value={arena.startingBalance} decimals={0} className="text-fg-faint" />
          <span aria-hidden>·</span>
          <span>{arena.participantCount} traders</span>
        </div>

        <div className="mt-2 text-[13px] font-medium text-fg-muted">{when}</div>

        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          {showJoinActions && arena.joined ? (
            <Link
              href={arena.status === 'ENDED' ? `/arenas/${arena.code}/results` : `/arenas/${arena.code}/live`}
              className="btn-primary min-h-[40px] flex-1 text-sm"
            >
              {arena.status === 'ENDED' ? 'Results' : 'Enter'}
            </Link>
          ) : arena.status === 'ENDED' ? (
            <Link href={`/arenas/${arena.code}/results`} className="btn-secondary min-h-[40px] flex-1 text-sm">
              Results
            </Link>
          ) : (
            <Link href={`/arenas/${arena.code}`} className="btn-primary min-h-[40px] flex-1 text-sm">
              Trade
            </Link>
          )}
          <Link
            href={`/arenas/${arena.code}/screen`}
            className="btn-secondary min-h-[40px] px-3.5 text-sm"
            target="_blank"
            rel="noreferrer"
            title="Projector view"
            aria-label={`Projector view for ${arena.name}`}
          >
            ↗
          </Link>
        </div>
      </Panel>
    </li>
  );
}
