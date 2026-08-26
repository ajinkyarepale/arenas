'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { EmptyState, Panel, StatusPill } from '@/components/ui';
import { cx, formatDateTime, formatDuration, formatPoints, formatRelative } from '@/lib/format';

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
 * The public arena directory. Browsing needs no account and no code — the code
 * is only the door into a specific room, and hiding the calendar behind it would
 * make the platform look empty to anyone considering running an event.
 */
export function ArenaDirectory({ showJoinActions = false }: { showJoinActions?: boolean }) {
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
    // Live arenas change state during an event; a slow refresh keeps the list
    // honest without polling hard.
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
    return arenas
      .filter((arena) => (filter === 'all' ? true : arena.status === filter))
      .filter((arena) =>
        needle
          ? [arena.name, arena.host, arena.asset, arena.code]
              .join(' ')
              .toLowerCase()
              .includes(needle)
          : true,
      );
  }, [arenas, query, filter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search markets</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by event, college, or asset"
            className="field"
          />
        </label>

        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded border border-line bg-ink-900 p-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setFilter(option.value)}
              className={cx(
                'btn !min-h-[38px] shrink-0 px-3 text-sm',
                filter === option.value
                  ? 'bg-ink-750 text-fg'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <Panel className="p-6 text-sm text-no">{error}</Panel>
      ) : visible === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-md bg-ink-850" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          body={
            query || filter !== 'all'
              ? 'No markets match that filter. Try clearing the search.'
              : 'No arenas have been scheduled yet. If you are running an event, you can create the first one.'
          }
          action={{ href: '/signup', label: 'Run an event' }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((arena) => (
            <ArenaCard key={arena.id} arena={arena} showJoinActions={showJoinActions} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ArenaCard({
  arena,
  showJoinActions,
}: {
  arena: DirectoryArena;
  showJoinActions: boolean;
}) {
  const when =
    arena.status === 'LIVE'
      ? `Round ${arena.currentRound} of ${arena.totalRounds} in play`
      : arena.status === 'ENDED'
        ? `Finished ${formatRelative(arena.endsAt)}`
        : arena.scheduledFor
          ? `${formatDateTime(arena.scheduledFor)} · ${formatRelative(arena.scheduledFor)}`
          : 'Open for joining';

  return (
    <li>
      <Panel
        className={cx(
          'group relative overflow-hidden p-5 transition-all hover:border-accent/40',
          arena.status === 'LIVE' && 'border-yes/30',
        )}
      >
        {/* A live arena gets a travelling light bar along its top edge. */}
        {arena.status === 'LIVE' ? (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
            aria-hidden
          >
            <div className="h-full w-24 animate-sweep bg-gradient-to-r from-transparent via-yes to-transparent" />
          </div>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={arena.status} />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-fg-faint">
                {arena.host}
              </span>
            </div>

            <h3 className="font-display mt-2 text-xl font-bold uppercase tracking-tight transition-colors group-hover:text-accent">
              {arena.name}
            </h3>

            {arena.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{arena.description}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-faint">
              <span>5-Min Candle</span>
              <span aria-hidden>·</span>
              <span>{arena.asset}</span>
              <span aria-hidden>·</span>
              <span>
                {arena.totalRounds} × {formatDuration(arena.roundDurationSec)}
              </span>
              <span aria-hidden>·</span>
              <span>{formatPoints(arena.startingBalance, 0)} starting pts</span>
              <span aria-hidden>·</span>
              <span>{arena.participantCount} joined</span>
            </div>

            <div className="mt-2 text-sm font-medium text-fg-muted">{when}</div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:w-40">
            {showJoinActions && arena.joined ? (
              <Link
                href={
                  arena.status === 'ENDED'
                    ? `/arenas/${arena.code}/results`
                    : `/arenas/${arena.code}/live`
                }
                className="btn-primary w-full text-sm"
              >
                {arena.status === 'ENDED' ? 'Results' : 'Enter'}
              </Link>
            ) : arena.status === 'ENDED' ? (
              <Link href={`/arenas/${arena.code}/results`} className="btn-secondary w-full text-sm">
                Results
              </Link>
            ) : (
              <Link href={`/arenas/${arena.code}`} className="btn-primary w-full text-sm">
                Join with code
              </Link>
            )}

            <Link
              href={`/arenas/${arena.code}/screen`}
              className="btn-ghost w-full text-xs"
              target="_blank"
              rel="noreferrer"
            >
              Big screen ↗
            </Link>
          </div>
        </div>
      </Panel>
    </li>
  );
}
