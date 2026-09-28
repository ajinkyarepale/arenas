'use client';

import { cx, formatPoints, formatSignedPoints } from '@/lib/format';
import type { LeaderboardEntry, LeaderboardPayload } from '@/lib/realtime/events';

/** Full leaderboard — used on the big screen and the results page. */
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
          'flex items-center justify-center rounded border border-dashed border-line text-fg-faint',
          isDisplay ? 'h-64 text-2xl' : 'h-32 text-sm',
        )}
      >
        Nobody has joined yet
      </div>
    );
  }

  return (
    <ol className={cx('flex flex-col', isDisplay ? 'gap-1.5' : 'gap-1')}>
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
  const medal = entry.rank <= 3;

  return (
    <li
      className={cx(
        'flex items-center gap-2.5 rounded-xl border transition-all duration-200',
        isDisplay ? 'px-4 py-2.5 xl:px-5 xl:py-3 gap-3.5' : 'px-2.5 py-1.5',
        highlighted
          ? 'border-accent/60 bg-accent/10 shadow-[0_0_20px_-8px_rgba(61,155,255,0.7)]'
          : entry.rank === 1
            ? 'border-[#EAB308]/60 bg-gradient-to-r from-[#EAB308]/15 via-[#EAB308]/5 to-transparent shadow-[0_0_25px_-8px_rgba(234,179,8,0.35)]'
            : entry.rank === 2
              ? 'border-[#E2E8F0]/40 bg-gradient-to-r from-[#E2E8F0]/10 via-[#E2E8F0]/5 to-transparent'
              : entry.rank === 3
                ? 'border-[#CD7F32]/40 bg-gradient-to-r from-[#CD7F32]/10 via-[#CD7F32]/5 to-transparent'
                : 'border-[#27272A]/80 bg-[#121215]',
      )}
    >
      <span
        className={cx(
          'font-display tnum flex shrink-0 items-center justify-center rounded-lg font-black border',
          isDisplay ? 'h-9 w-9 text-base xl:h-10 xl:w-10 xl:text-lg' : 'h-6 w-6 text-xs',
          entry.rank === 1 && 'bg-[#EAB308]/25 border-[#EAB308]/60 text-[#EAB308] shadow-[0_0_14px_-2px_rgba(255,176,32,0.7)]',
          entry.rank === 2 && 'bg-[#E2E8F0]/25 border-[#E2E8F0]/50 text-[#E2E8F0]',
          entry.rank === 3 && 'bg-[#CD7F32]/25 border-[#CD7F32]/50 text-[#FFA07A]',
          entry.rank > 3 && 'bg-[#18181b] border-[#27272A] text-[#a1a1aa]',
        )}
      >
        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
      </span>

      <RankDelta delta={entry.rankDelta} variant={variant} />

      <span
        className={cx(
          'min-w-0 flex-1 truncate font-["Geist"] font-bold text-white',
          isDisplay ? 'text-lg xl:text-xl' : 'text-xs',
        )}
      >
        {entry.displayName}
      </span>

      {showPnl && entry.lastRoundPnl !== 0 ? (
        <span
          className={cx(
            'tnum shrink-0 font-bold font-mono',
            isDisplay ? 'text-base xl:text-lg' : 'text-[11px]',
            entry.lastRoundPnl > 0 ? 'text-[#22C55E]' : 'text-[#EF4444]',
          )}
        >
          {formatSignedPoints(entry.lastRoundPnl, 0)}
        </span>
      ) : null}

      <span
        className={cx(
          'tnum shrink-0 font-bold tabular-nums font-mono',
          isDisplay ? 'w-32 xl:w-40 text-right text-lg xl:text-xl text-white' : 'w-20 text-right text-xs',
        )}
      >
        {formatPoints(entry.balance, 0)}
        {isDisplay ? <span className="text-[#a1a1aa] text-xs xl:text-sm font-normal ml-1">pts</span> : null}
      </span>
    </li>
  );
}

/** Rank-change arrow. Neutral dash when a participant held their position. */
function RankDelta({
  delta,
  variant,
}: {
  delta: number;
  variant: 'compact' | 'display';
}) {
  const isDisplay = variant === 'display';
  const size = isDisplay ? 'text-xl w-8' : 'text-[10px] w-5';

  if (delta === 0) {
    return (
      <span className={cx('shrink-0 text-center text-fg-faint', size)} aria-hidden>
        ·
      </span>
    );
  }

  return (
    <span
      className={cx(
        'tnum shrink-0 text-center font-bold',
        size,
        delta > 0 ? 'text-yes' : 'text-no',
      )}
      aria-label={delta > 0 ? `Up ${delta} places` : `Down ${Math.abs(delta)} places`}
    >
      {delta > 0 ? '▲' : '▼'}
      {Math.abs(delta) > 1 ? Math.abs(delta) : ''}
    </span>
  );
}

/**
 * The strip on the trading screen: your own rank plus the top three. On a phone
 * mid-round that is all the leaderboard anyone needs — the full list is a scroll
 * away and the projector has it anyway.
 */
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
        <div className="flex shrink-0 items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-3 py-2">
          <span className="tnum text-sm font-bold text-accent">#{rank}</span>
          <span className="text-xs font-semibold text-accent">You</span>
          {me ? (
            <span className="tnum text-xs text-fg-muted">{formatPoints(me.balance, 0)}</span>
          ) : null}
        </div>
      ) : null}

      {top.map((entry) => (
        <div
          key={entry.participantId}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2',
            entry.participantId === participantId
              ? 'border-accent/50 bg-accent/10'
              : 'border-line bg-ink-850',
          )}
        >
          <span
            className={cx(
              'tnum text-sm font-bold',
              entry.rank === 1 ? 'text-warn' : 'text-fg-faint',
            )}
          >
            #{entry.rank}
          </span>
          <span className="max-w-[7rem] truncate text-xs font-semibold">
            {entry.participantId === participantId ? 'You' : entry.displayName}
          </span>
          <span className="tnum text-xs text-fg-muted">{formatPoints(entry.balance, 0)}</span>
        </div>
      ))}

      {data ? (
        <span className="shrink-0 px-2 text-xs text-fg-faint">
          {data.participantCount} traders
        </span>
      ) : null}
    </div>
  );
}
