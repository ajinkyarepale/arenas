'use client';

import Link from 'next/link';

import { Arcs, ArcsSigned } from '@/components/arcs-mark';
import { cx, formatPoints } from '@/lib/format';
import type { LeaderboardEntry, LeaderboardPayload } from '@/lib/realtime/events';

/** Full leaderboard — trading screen, results, projector. */
export function Leaderboard({
  data,
  limit = 10,
  variant = 'compact',
  highlightParticipantId,
  showPnl = true,
}: {
  data: LeaderboardPayload | null;
  limit?: number;
  variant?: 'compact' | 'display';
  highlightParticipantId?: string | null;
  showPnl?: boolean;
}) {
  const isDisplay = variant === 'display';
  const entries = data?.entries.slice(0, limit) ?? [];

  if (entries.length === 0) {
    return (
      <div
        className={cx(
          'flex items-center justify-center rounded-lg border border-dashed border-line bg-ink-950 text-fg-faint',
          isDisplay ? 'h-64 text-2xl' : 'h-24 text-sm',
        )}
      >
        Nobody has joined yet
      </div>
    );
  }

  return (
    <ol className={cx('flex flex-col', isDisplay ? 'gap-2' : 'gap-0.5')}>
      {entries.map((entry) => (
        <LeaderboardRow
          key={entry.participantId}
          entry={entry}
          variant={variant}
          highlighted={entry.participantId === highlightParticipantId}
          showPnl={showPnl}
        />
      ))}
    </ol>
  );
}

function LeaderboardRow({
  entry,
  variant,
  highlighted,
  showPnl,
}: {
  entry: LeaderboardEntry;
  variant: 'compact' | 'display';
  highlighted: boolean;
  showPnl: boolean;
}) {
  const isDisplay = variant === 'display';

  return (
    <li
      className={cx(
        'row-line flex items-center gap-3 transition-colors',
        isDisplay ? 'py-3.5' : 'py-2',
        highlighted && 'rounded-lg border border-accent/40 bg-accent/10 px-2.5',
      )}
    >
      <span
        className={cx(
          'tnum flex shrink-0 items-center justify-center rounded-md text-[13px] font-extrabold',
          isDisplay ? 'h-11 w-11 text-2xl' : 'h-7 w-7',
          entry.rank === 1 && 'bg-warn/15 text-warn',
          entry.rank === 2 && 'bg-ink-750 text-fg-muted',
          entry.rank === 3 && 'bg-plasma/15 text-plasma',
          entry.rank > 3 && 'bg-ink-850 text-fg-faint',
        )}
      >
        {entry.rank}
      </span>

      <RankDelta delta={entry.rankDelta} variant={variant} />

      <span className={cx('min-w-0 flex-1 truncate font-semibold text-fg', isDisplay ? 'text-3xl' : 'text-sm')}>
        {entry.displayName}
      </span>

      {showPnl && entry.lastRoundPnl !== 0 ? (
        <span className={cx('tnum shrink-0 font-bold', isDisplay ? 'text-2xl' : 'text-xs', entry.lastRoundPnl > 0 ? 'text-yes' : 'text-no')}>
          <ArcsSigned value={entry.lastRoundPnl} decimals={0} />
        </span>
      ) : null}

      <span className={cx('shrink-0 font-extrabold tabular-nums text-fg', isDisplay ? 'w-44 text-right text-3xl' : 'w-24 text-right text-sm')}>
        <Arcs value={entry.balance} decimals={isDisplay ? 0 : 2} />
      </span>
    </li>
  );
}

function RankDelta({ delta, variant }: { delta: number; variant: 'compact' | 'display' }) {
  const size = variant === 'display' ? 'text-xl w-8' : 'text-[10px] w-5';

  if (delta === 0) {
    return (
      <span className={cx('shrink-0 text-center text-fg-faint/50', size)} aria-hidden>
        –
      </span>
    );
  }

  return (
    <span
      className={cx('tnum shrink-0 text-center font-bold', size, delta > 0 ? 'text-yes' : 'text-no')}
      aria-label={delta > 0 ? `Up ${delta} places` : `Down ${Math.abs(delta)} places`}
      title={delta > 0 ? `Up ${delta}` : `Down ${Math.abs(delta)}`}
    >
      {delta > 0 ? '▲' : '▼'}
      {Math.abs(delta) > 1 ? Math.abs(delta) : ''}
    </span>
  );
}

/** Compact strip: your rank + top three. */
export function LeaderboardStrip({
  data,
  participantId,
  rank,
}: {
  data: LeaderboardPayload | null;
  participantId: string | null;
  rank: number | null;
}) {
  const top = data?.entries.slice(0, 3) ?? [];
  const me = data?.entries.find((entry) => entry.participantId === participantId);
  const inTop = top.some((entry) => entry.participantId === participantId);

  return (
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
      {rank !== null && !inTop ? (
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
          <span className="tnum text-sm font-extrabold text-accent-light">#{rank}</span>
          <span className="text-xs font-bold text-accent-light">You</span>
          {me ? <span className="text-xs text-fg-muted"><Arcs value={me.balance} decimals={0} /></span> : null}
        </div>
      ) : null}

      {top.map((entry) => (
        <div
          key={entry.participantId}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2',
            entry.participantId === participantId ? 'border-accent/40 bg-accent/10' : 'border-line bg-ink-900',
          )}
        >
          <span className={cx('tnum text-sm font-extrabold', entry.rank === 1 ? 'text-warn' : 'text-fg-faint')}>
            #{entry.rank}
          </span>
          <span className="max-w-[7rem] truncate text-xs font-semibold text-fg">
            {entry.participantId === participantId ? 'You' : entry.displayName}
          </span>
          <span className="text-xs text-fg-muted"><Arcs value={entry.balance} decimals={0} /></span>
        </div>
      ))}

      {data ? (
        <Link href="#leaderboard" className="shrink-0 px-2 text-xs font-semibold text-fg-faint hover:text-fg">
          {data.participantCount} traders →
        </Link>
      ) : null}
    </div>
  );
}
