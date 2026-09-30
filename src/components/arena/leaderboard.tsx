'use client';

import React, { memo } from 'react';
import { cx, formatPoints, formatSignedPoints } from '@/lib/format';
import type { LeaderboardEntry, LeaderboardPayload } from '@/lib/realtime/events';

export interface LeaderboardProps {
  data: LeaderboardPayload | null;
  limit?: number;
  variant?: 'compact' | 'display';
  highlightParticipantId?: string | null;
  showPnl?: boolean;
}

/** Full leaderboard — used on the big screen, participant view, and results page. */
export const Leaderboard = memo(function Leaderboard({
  data,
  limit = 10,
  variant = 'compact',
  highlightParticipantId,
  showPnl = true,
}: LeaderboardProps) {
  const isDisplay = variant === 'display';
  const entries = data?.entries.slice(0, limit) ?? [];

  if (entries.length === 0) {
    return (
      <div
        className={cx(
          'flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#27272A] bg-[#121215]/40 text-[#a1a1aa] p-6 text-center transition-all',
          isDisplay ? 'h-64 gap-3' : 'h-36 gap-2',
        )}
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1c1c20] border border-[#27272A]">
          <span className="material-symbols-outlined text-[20px] text-[#F59E0B]">military_tech</span>
        </div>
        <p className={cx('font-medium', isDisplay ? 'text-base text-[#e5e2e1]' : 'text-xs')}>
          Tournament Stage Open
        </p>
        <p className="text-[11px] text-[#71717a] max-w-[200px]">
          Leaderboard updates automatically as predictions are resolved.
        </p>
      </div>
    );
  }

  return (
    <ol className={cx('flex flex-col', isDisplay ? 'gap-2.5' : 'gap-1.5')}>
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
});

export const LeaderboardRow = memo(function LeaderboardRow({
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
  const isFirst = entry.rank === 1;
  const isSecond = entry.rank === 2;
  const isThird = entry.rank === 3;
  const rankNumber = String(entry.rank).padStart(2, '0');

  return (
    <li
      className={cx(
        'group flex items-center rounded-xl border transition-all duration-200 select-none relative overflow-hidden',
        isDisplay ? 'px-3.5 py-2.5 gap-3 xl:px-4 xl:py-3' : 'px-2.5 py-1.5 gap-2',
        highlighted
          ? 'border-[#22C55E]/60 bg-gradient-to-r from-[#22C55E]/15 via-[#22C55E]/5 to-transparent shadow-[0_0_20px_-6px_rgba(34,197,94,0.4)]'
          : isFirst
            ? 'border-[#EAB308]/60 bg-gradient-to-r from-[#EAB308]/20 via-[#EAB308]/5 to-[#121215] shadow-[0_0_25px_-8px_rgba(234,179,8,0.4)]'
            : isSecond
              ? 'border-[#E2E8F0]/40 bg-gradient-to-r from-[#E2E8F0]/15 via-[#E2E8F0]/5 to-[#121215]'
              : isThird
                ? 'border-[#CD7F32]/40 bg-gradient-to-r from-[#CD7F32]/15 via-[#CD7F32]/5 to-[#121215]'
                : 'border-[#27272A]/70 bg-[#121215]/80 hover:border-[#3f3f46] hover:bg-[#16161a]',
      )}
    >
      {/* Rank Indicator Badge */}
      <div
        className={cx(
          'flex shrink-0 items-center justify-center rounded-lg font-black border font-mono tracking-tight transition-transform duration-150 group-hover:scale-105',
          isDisplay ? 'h-8 w-8 text-xs xl:h-9 xl:w-9 xl:text-sm' : 'h-6 w-6 text-[10px]',
          isFirst && 'bg-[#EAB308]/20 border-[#EAB308]/70 text-[#EAB308] shadow-[0_0_12px_rgba(234,179,8,0.4)]',
          isSecond && 'bg-[#E2E8F0]/15 border-[#E2E8F0]/60 text-[#E2E8F0]',
          isThird && 'bg-[#CD7F32]/20 border-[#CD7F32]/60 text-[#FFA07A]',
          entry.rank > 3 && 'bg-[#18181b] border-[#27272A] text-[#71717a]',
        )}
      >
        {rankNumber}
      </div>

      {/* Rank Delta / Movement */}
      <RankDelta delta={entry.rankDelta} variant={variant} />

      {/* Participant Name & Status */}
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span
          className={cx(
            'truncate font-["Geist"] font-bold text-white tracking-tight',
            isDisplay ? 'text-sm xl:text-base' : 'text-xs',
          )}
          title={entry.displayName}
        >
          {entry.displayName}
        </span>
        {highlighted && (
          <span className="shrink-0 px-1.5 py-0.2 rounded bg-[#22C55E]/20 border border-[#22C55E]/40 text-[#22C55E] text-[10px] font-bold uppercase tracking-wider">
            You
          </span>
        )}
      </div>

      {/* Last Round PnL Chip */}
      {showPnl && entry.lastRoundPnl !== 0 ? (
        <span
          className={cx(
            'shrink-0 px-2 py-0.5 rounded-md font-mono font-bold tabular-nums border text-center',
            isDisplay ? 'text-xs xl:text-sm px-2 py-0.5' : 'text-[10px]',
            entry.lastRoundPnl > 0
              ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
              : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]',
          )}
        >
          {formatSignedPoints(entry.lastRoundPnl, 0)}
        </span>
      ) : null}

      {/* Total Balance / Score */}
      <div
        className={cx(
          'shrink-0 text-right font-mono font-black tabular-nums text-white flex items-baseline justify-end gap-1 min-w-[70px]',
          isDisplay ? 'text-base xl:text-lg' : 'text-xs sm:text-sm',
        )}
      >
        <span>{formatPoints(entry.balance, 0)}</span>
        <span className="text-[#71717a] text-[10px] xl:text-xs font-normal">arcs</span>
      </div>
    </li>
  );
});

/** Rank-change arrow with animation */
function RankDelta({
  delta,
  variant,
}: {
  delta: number;
  variant: 'compact' | 'display';
}) {
  const isDisplay = variant === 'display';
  const size = isDisplay ? 'text-xs w-7' : 'text-[10px] w-5';

  if (delta === 0) {
    return (
      <span className={cx('shrink-0 text-center text-[#52525b] font-mono select-none', size)}>
        —
      </span>
    );
  }

  const isUp = delta > 0;

  return (
    <span
      className={cx(
        'shrink-0 flex items-center justify-center font-mono font-bold leading-none select-none rounded px-1 py-0.5',
        size,
        isUp ? 'text-[#22C55E] bg-[#22C55E]/10' : 'text-[#EF4444] bg-[#EF4444]/10',
      )}
      aria-label={isUp ? `Up ${delta} places` : `Down ${Math.abs(delta)} places`}
    >
      <span className="text-[10px] mr-0.5">{isUp ? '▲' : '▼'}</span>
      <span>{Math.abs(delta)}</span>
    </span>
  );
}

/** Sticky participant ranking strip */
export const LeaderboardStrip = memo(function LeaderboardStrip({
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
    <div className="no-scrollbar flex items-center gap-2 overflow-x-auto py-1">
      {rank !== null && !inTop ? (
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-[#22C55E]/50 bg-[#22C55E]/10 px-3 py-1.5 shadow-[0_0_15px_-4px_rgba(34,197,94,0.4)]">
          <span className="font-mono text-xs font-black text-[#22C55E]">#{rank}</span>
          <span className="text-xs font-bold text-white">You</span>
          {me ? (
            <span className="font-mono text-xs font-semibold text-[#a1a1aa]">{formatPoints(me.balance, 0)} arcs</span>
          ) : null}
        </div>
      ) : null}

      {top.map((entry) => (
        <div
          key={entry.participantId}
          className={cx(
            'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-1.5 transition-all',
            entry.participantId === participantId
              ? 'border-[#22C55E]/50 bg-[#22C55E]/10 shadow-[0_0_15px_-4px_rgba(34,197,94,0.4)]'
              : entry.rank === 1
                ? 'border-[#EAB308]/40 bg-[#EAB308]/10'
                : 'border-[#27272A] bg-[#141417]',
          )}
        >
          <span
            className={cx(
              'font-mono text-xs font-bold',
              entry.rank === 1 ? 'text-[#EAB308]' : 'text-[#a1a1aa]',
            )}
          >
            {`#${entry.rank}`}
          </span>
          <span className="max-w-[7rem] truncate text-xs font-bold text-white">
            {entry.participantId === participantId ? 'You' : entry.displayName}
          </span>
          <span className="font-mono text-xs font-semibold text-[#a1a1aa]">{formatPoints(entry.balance, 0)} arcs</span>
        </div>
      ))}

      {data ? (
        <span className="shrink-0 px-2 text-[11px] font-mono text-[#71717a]">
          {data.participantCount} traders
        </span>
      ) : null}
    </div>
  );
});
