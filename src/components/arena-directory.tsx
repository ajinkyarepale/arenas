'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ArenaShareModal } from '@/components/arena/arena-share-modal';
import { formatDateTime, formatDuration, formatPoints } from '@/lib/format';

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
  resolvedOutcome: 'YES' | 'NO' | 'VOID' | null;
  resolvedAt: string | null;
  createdAt: string;
  scheduledFor: string | null;
  startedAt: string | null;
  endsAt: string | null;
  participantCount: number;
  predictionCount: number;
  joined: boolean;
  prediction?: {
    hasPredictions: boolean;
    tradeCount: number;
    priceYes: number | null;
    yesPercent: number | null;
    noPercent: number | null;
    qYes: number;
    qNo: number;
  };
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
  const [shareArena, setShareArena] = useState<{ code: string; name: string } | null>(null);

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
    }, 10_000);

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
              className="h-72 animate-pulse rounded-xl border border-[#27272A] bg-[#201f1f]/50"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-[#27272A] bg-[#201f1f]/40 p-12 text-center flex flex-col items-center">
          <h3 className="font-['Geist'] text-lg font-bold text-white">No arenas found</h3>
          <p className="text-sm text-[#c4c7c8] mt-1 max-w-sm">
            {filter === 'ENDED'
              ? 'No finished arenas yet. Active tournaments will appear here once ended.'
              : filter === 'LIVE'
                ? 'No arenas are live right now. Check Upcoming or host a new one.'
                : 'No arenas currently match your search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((arena) => {
            const isResolved = arena.status === 'ENDED' && arena.resolvedOutcome !== null;
            const isAwaitingResolution = arena.status === 'ENDED' && arena.resolvedOutcome === null;

            return (
              <div
                key={arena.id}
                className={`border border-[#27272A] rounded-xl p-5 flex flex-col gap-4 transition-colors group ${
                  arena.status === 'ENDED'
                    ? 'bg-[#1c1b1b] opacity-90'
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
                        UPCOMING
                      </span>
                    ) : isResolved ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full border font-['Epilogue'] text-[11px] font-bold ${
                          arena.resolvedOutcome === 'YES'
                            ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                            : arena.resolvedOutcome === 'NO'
                              ? 'bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]'
                              : 'bg-[#EAB308]/15 border-[#EAB308]/30 text-[#EAB308]'
                        }`}
                      >
                        Resolved — {arena.resolvedOutcome}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">
                        Finished — awaiting resolution
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShareArena({ code: arena.code, name: arena.name })}
                      className="p-1 rounded bg-[#201f1f] hover:bg-[#27272A] border border-[#27272A] text-[#c4c7c8] hover:text-white transition-colors text-xs flex items-center gap-1"
                      title="Share Arena & QR Code"
                    >
                      <span className="material-symbols-outlined text-[14px]">qr_code_2</span>
                    </button>
                    <span className="px-2 py-0.5 rounded bg-[#201f1f] border border-[#27272A] font-mono text-xs font-semibold text-white">
                      {arena.code}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-['Geist'] text-xl font-medium text-white mb-1 group-hover:text-white transition-colors">
                    {arena.name}
                  </h3>
                  <p className="font-['Geist'] text-xs text-[#c4c7c8] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">person</span> Hosted by {arena.host}
                  </p>
                  {arena.scheduledFor && (
                    <p className="font-['Epilogue'] text-[11px] text-[#8e9192] mt-1">
                      Scheduled: {formatDateTime(arena.scheduledFor)}
                    </p>
                  )}
                  {arena.resolvedAt && (
                    <p className="font-['Epilogue'] text-[11px] text-[#22C55E] mt-1">
                      Resolved: {formatDateTime(arena.resolvedAt)}
                    </p>
                  )}
                </div>

                {/* YES / NO Probability Split Bar */}
                <div className="py-2.5 px-3 rounded-lg bg-[#141414] border border-[#27272A] flex flex-col gap-1.5">
                  <div className="flex justify-between items-center text-[10px] font-['Epilogue'] font-bold text-[#c4c7c8] uppercase">
                    <span>Market Prediction</span>
                    {arena.prediction?.hasPredictions ? (
                      <span className="text-[#22C55E]">Live</span>
                    ) : (
                      <span className="text-[#8e9192]">No trades yet</span>
                    )}
                  </div>
                  {arena.prediction?.hasPredictions && arena.prediction.priceYes !== null ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#27272A]" role="img">
                        <div
                          className="bg-[#22C55E] transition-[width] duration-300"
                          style={{ width: `${arena.prediction.yesPercent}%` }}
                        />
                        <div className="flex-1 bg-[#ef4444]/80" />
                      </div>
                      <div className="flex justify-between font-mono text-[11px] font-bold">
                        <span className="text-[#22C55E]">YES — {arena.prediction.yesPercent}%</span>
                        <span className="text-[#ef4444]">NO — {arena.prediction.noPercent}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#27272A]/50">
                        <div className="w-full bg-[#27272A]/40" />
                      </div>
                      <div className="flex justify-between text-[11px] font-medium text-[#8e9192]">
                        <span>YES — —%</span>
                        <span className="italic text-[10px]">No predictions yet</span>
                        <span>NO — —%</span>
                      </div>
                    </div>
                  )}
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
                    <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8]">PREDICTIONS</span>
                    <span className="font-['Epilogue'] text-xs font-medium text-white">
                      {arena.predictionCount ?? arena.prediction?.tradeCount ?? 0} placed
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
            );
          })}
        </div>
      )}

      {/* Share Modal */}
      {shareArena && (
        <ArenaShareModal
          code={shareArena.code}
          name={shareArena.name}
          isOpen={true}
          onClose={() => setShareArena(null)}
        />
      )}
    </div>
  );
}
