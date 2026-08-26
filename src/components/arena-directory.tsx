'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { formatDuration, formatPoints } from '@/lib/format';

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

export function ArenaDirectory({ showJoinActions }: { showJoinActions?: boolean } = {}) {
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
    <div className="flex flex-col gap-6 w-full font-['Geist']">
      {/* Search & Filters Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#c4c7c8] text-sm">
            search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-[#201f1f] border border-[#27272A] rounded-lg py-2 pl-10 pr-4 font-['Geist'] text-sm text-[#e5e2e1] placeholder-[#c4c7c8]/50 focus:outline-none focus:border-white transition-colors"
            placeholder="Search by title, host, asset, code..."
            type="text"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-[#201f1f] border border-[#27272A] rounded-lg overflow-x-auto w-full md:w-auto">
          {FILTERS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-1.5 rounded font-['Epilogue'] text-xs whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? 'bg-[#3a3939] text-white font-medium'
                  : 'text-[#c4c7c8] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-sm">
          {error}
        </div>
      ) : null}

      {/* Arena Card Grid */}
      {visible === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 animate-pulse rounded-xl border border-[#27272A] bg-[#201f1f]/50"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#201f1f]/40 p-12 text-center flex flex-col items-center">
          <h3 className="font-['Geist'] text-lg font-bold text-white">No arenas found</h3>
          <p className="text-sm text-[#c4c7c8] mt-1 max-w-sm">
            Try adjusting your search query or switching filters to see available prediction markets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((arena) => (
            <div
              key={arena.id}
              className={`border border-[#27272A] rounded-xl p-5 flex flex-col gap-4 transition-colors group ${
                arena.status === 'ENDED'
                  ? 'bg-[#1c1b1b] opacity-75'
                  : 'bg-[rgba(20,20,20,0.7)] backdrop-blur-xl hover:border-[#444748]'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {arena.status === 'LIVE' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 font-['Epilogue'] text-[11px] font-bold text-[#22C55E] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                    </span>
                  ) : arena.status === 'LOBBY' ? (
                    <span className="px-2 py-0.5 rounded-full bg-[#EAB308]/10 border border-[#EAB308]/20 font-['Epilogue'] text-[11px] font-bold text-[#EAB308]">
                      LOBBY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">
                      ENDED
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-xs font-medium text-[#c4c7c8]">
                  {arena.code}
                </span>
              </div>

              <div>
                <h3 className="font-['Geist'] text-xl font-medium text-white mb-1 group-hover:text-white transition-colors">
                  {arena.name}
                </h3>
                <p className="font-['Geist'] text-xs text-[#c4c7c8] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">person</span> Hosted by {arena.host}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 py-3 border-y border-[#27272A]">
                <div className="flex flex-col gap-0.5">
                  <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">ASSET</span>
                  <span className="font-['Epilogue'] text-xs font-medium text-white">{arena.asset}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">FORMAT</span>
                  <span className="font-['Epilogue'] text-xs font-medium text-white">
                    {arena.totalRounds} × {formatDuration(arena.roundDurationSec)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">PARTICIPANTS</span>
                  <span className="font-['Epilogue'] text-xs font-medium text-white">
                    {arena.participantCount} joined
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">START BAL</span>
                  <span className="font-['Epilogue'] text-xs font-medium text-white">
                    {formatPoints(arena.startingBalance, 0)} pts
                  </span>
                </div>
              </div>

              <Link
                href={
                  arena.status === 'ENDED'
                    ? `/arenas/${arena.code}/results`
                    : `/arenas/${arena.code}`
                }
                className={`mt-auto w-full py-2 rounded-full font-['Epilogue'] text-xs text-center font-medium transition-colors ${
                  arena.status === 'ENDED'
                    ? 'border border-[#27272A] text-white hover:bg-[#201f1f]'
                    : 'bg-white text-[#2f3131] hover:bg-[#c6c6c7]'
                }`}
              >
                {arena.status === 'ENDED' ? 'View Results' : 'Join Arena'}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
