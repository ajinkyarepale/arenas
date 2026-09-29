'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { SiteSidebar } from '@/components/site-sidebar';
import { TournamentAnalysis } from '@/components/arena/tournament-analysis';
import { cx, formatDateTime, formatPoints } from '@/lib/format';
import type { AnalyticsOverviewPayload, EventOverviewItem } from '@/app/api/analytics/overview/route';
import type { ArenaPublicInfo } from '@/lib/engine/snapshot';

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<AnalyticsOverviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedArena, setSelectedArena] = useState<ArenaPublicInfo | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LIVE' | 'ENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics/overview', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load analytics overview');
      const json: AnalyticsOverviewPayload = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error loading analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOverview();
  }, [fetchOverview]);

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter((ev) => {
      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'LIVE'
            ? ev.status === 'LIVE'
            : ev.status === 'ENDED';

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        ev.name.toLowerCase().includes(q) ||
        ev.code.toLowerCase().includes(q) ||
        ev.asset.toLowerCase().includes(q) ||
        (ev.collegeName && ev.collegeName.toLowerCase().includes(q));

      return matchesStatus && matchesQuery;
    });
  }, [data, statusFilter, searchQuery]);

  const handleOpenEventAnalytics = (eventItem: EventOverviewItem) => {
    const publicInfo: ArenaPublicInfo = {
      id: eventItem.id,
      code: eventItem.code,
      name: eventItem.name,
      description: null,
      hostName: null,
      organizerName: eventItem.organizerName ?? 'Organizer',
      marketCategory: eventItem.marketCategory as any,
      question: null,
      resolutionCriteria: null,
      isManualResolution: false,
      collegeName: eventItem.collegeName,
      collegeLogoUrl: null,
      themeColor: null,
      enableBots: false,
      asset: eventItem.asset,
      roundDurationSec: 120,
      lockBufferSec: 12,
      totalRounds: eventItem.totalRounds,
      startingBalance: 1000,
      liquidityParamB: 40,
      maxStakePerTrade: 250,
      status: eventItem.status as any,
      currentRound: eventItem.currentRound,
      scheduledFor: null,
      startedAt: eventItem.startedAt,
      endsAt: eventItem.endsAt,
      resolvedOutcome: null,
      resolvedAt: null,
      createdAt: eventItem.createdAt,
      participantCount: eventItem.participantCount,
      predictionCount: eventItem.tradeCount,
      tradesPerMinuteLimit: 0,
    };
    setSelectedArena(publicInfo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If a tournament is selected for deep-dive, show the rich tournament analytics view
  if (selectedArena) {
    return (
      <div className="min-h-screen bg-[#09090b] text-[#e5e2e1] font-['Geist']">
        {/* Top return banner */}
        <div className="sticky top-0 z-40 bg-[#121215]/95 border-b border-[#27272A] px-4 sm:px-8 py-3 flex items-center justify-between backdrop-blur-xl">
          <button
            onClick={() => setSelectedArena(null)}
            className="flex items-center gap-2 text-xs font-bold text-[#a1a1aa] hover:text-white bg-[#1a1a1e] hover:bg-[#27272A] px-3.5 py-1.5 rounded-xl border border-[#27272A] transition-all duration-150 active:scale-95"
          >
            <span>←</span>
            <span>Back to All Tournaments Overview</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-1 rounded-full font-bold">
              {selectedArena.code}
            </span>
            <Link
              href={`/arenas/${selectedArena.code}/screen`}
              target="_blank"
              className="text-xs text-[#38BDF8] hover:underline hidden sm:inline"
            >
              Open Big Screen ↗
            </Link>
          </div>
        </div>

        <TournamentAnalysis
          initialArena={selectedArena}
          onSelectView={(view) => {
            if (view === 'live') {
              window.open(`/arenas/${selectedArena.code}/live`, '_blank');
            } else if (view === 'screen') {
              window.open(`/arenas/${selectedArena.code}/screen`, '_blank');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#09090b] text-[#e5e2e1] font-['Geist'] min-h-screen flex selection:bg-[#22C55E]/30">
      {/* Sidebar Navigation */}
      <SiteSidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pt-16 md:pt-0">
        {/* Top Header */}
        <header className="hidden md:flex bg-[#0d0d10]/80 top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-8 z-30">
          <div className="flex items-center gap-3">
            <span className="font-['Epilogue'] text-xs font-black text-[#22C55E] tracking-widest uppercase bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-1 rounded-full">
              GLOBAL ANALYTICS
            </span>
            <span className="text-xs text-[#71717a]">·</span>
            <span className="text-xs text-[#a1a1aa] font-medium">Platform & Tournament Intelligence</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void fetchOverview()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141417] hover:bg-[#1f1f23] text-xs font-semibold text-[#c4c7c8] hover:text-white border border-[#27272A] transition-all active:scale-95"
              title="Refresh Analytics"
            >
              <span className={cx('text-sm', loading && 'animate-spin')}>↻</span>
              <span>Refresh</span>
            </button>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-[1400px] w-full mx-auto flex flex-col gap-6 md:gap-8">
          {/* Hero Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                Event Overview & Intelligence
              </h1>
              <p className="text-xs sm:text-sm text-[#a1a1aa] mt-1.5 max-w-2xl leading-relaxed">
                Aggregated market telemetry across all prediction tournaments. Click any tournament card below to inspect its round-by-round calibration curve, PnL tape, and crowd sentiment.
              </p>
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Points Volume */}
            <div className="bg-[#121215]/80 border border-[#27272A] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#3f3f46] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#22C55E]/10 rounded-full blur-2xl pointer-events-none" />
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Total Volume Traded
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {data ? formatPoints(data.summary.totalVolume, 0) : '—'}
                <span className="text-xs text-[#22C55E] font-normal ml-1.5">pts</span>
              </p>
            </div>

            {/* Total Predictions / Trades */}
            <div className="bg-[#121215]/80 border border-[#27272A] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#3f3f46] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#38BDF8]/10 rounded-full blur-2xl pointer-events-none" />
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Total Predictions
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {data ? data.summary.totalPredictions.toLocaleString() : '—'}
                <span className="text-xs text-[#38BDF8] font-normal ml-1.5">trades</span>
              </p>
            </div>

            {/* Active / Hosted Tournaments */}
            <div className="bg-[#121215]/80 border border-[#27272A] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#3f3f46] transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">
                  Tournaments Hosted
                </p>
                {data && data.summary.liveEvents > 0 && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] text-[10px] font-bold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    {data.summary.liveEvents} LIVE
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {data ? data.summary.totalEvents : '—'}
                <span className="text-xs text-[#a1a1aa] font-normal ml-1.5">arenas</span>
              </p>
            </div>

            {/* Overall Accuracy / Calibration */}
            <div className="bg-[#121215]/80 border border-[#27272A] rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden group hover:border-[#3f3f46] transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#EAB308]/10 rounded-full blur-2xl pointer-events-none" />
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider mb-2">
                Crowd Accuracy
              </p>
              <p className="text-2xl sm:text-3xl font-black font-mono text-[#EAB308] tracking-tight">
                {data && data.summary.overallAccuracyRate != null
                  ? `${Math.round(data.summary.overallAccuracyRate * 100)}%`
                  : 'N/A'}
                <span className="text-xs text-[#a1a1aa] font-normal ml-1.5">consensus</span>
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#121215]/60 p-2 rounded-2xl border border-[#27272A]">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-1 bg-[#09090b] rounded-xl border border-[#27272A]">
              {(['ALL', 'LIVE', 'ENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cx(
                    'px-3.5 py-1.5 rounded-lg text-xs font-["Epilogue"] font-bold transition-all duration-150 active:scale-95',
                    statusFilter === filter
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm'
                      : 'text-[#a1a1aa] hover:text-white border border-transparent',
                  )}
                >
                  {filter === 'ALL'
                    ? `All (${data?.events.length ?? 0})`
                    : filter === 'LIVE'
                      ? `Live (${data?.summary.liveEvents ?? 0})`
                      : `Ended (${data?.summary.endedEvents ?? 0})`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search tournament, asset, or college…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#16161a] border border-[#27272A] rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#22C55E]/50 focus:ring-1 focus:ring-[#22C55E]/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717a] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tournaments Grid */}
          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl border border-[#27272A] bg-[#141417]/50 animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-[#27272A] text-center gap-3 bg-[#121215]/30">
              <span className="text-3xl">🔍</span>
              <p className="text-base font-bold text-white">No tournaments matched your criteria</p>
              <p className="text-xs text-[#a1a1aa] max-w-xs">
                Try searching with a different keyword or resetting your filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((ev) => {
                const isLive = ev.status === 'LIVE';
                const hasAccuracy = ev.accuracyRate != null;

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEventAnalytics(ev)}
                    className="group flex flex-col justify-between p-5 rounded-2xl border border-[#27272A] bg-[#121215]/80 hover:bg-[#16161a] hover:border-[#38BDF8]/40 hover:shadow-2xl hover:shadow-[#38BDF8]/5 transition-all duration-200 cursor-pointer relative overflow-hidden"
                  >
                    {/* Top Row: Code Pill & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#18181c] border border-[#27272A] font-mono text-xs font-bold text-white tracking-wider">
                          {ev.code}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2 py-0.5 rounded-md">
                          {ev.asset}
                        </span>
                      </div>

                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#27272A]/50 border border-[#27272A] text-[#a1a1aa] font-mono text-[10px] font-semibold uppercase">
                          {ev.status}
                        </span>
                      )}
                    </div>

                    {/* Tournament Title & College */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-white group-hover:text-[#38BDF8] transition-colors tracking-tight line-clamp-1">
                        {ev.name}
                      </h3>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">
                        {ev.collegeName || ev.organizerName || 'Campus FinTech Event'}
                      </p>
                    </div>

                    {/* Mini Round Outcomes Breakdown */}
                    <div className="mb-4 pt-3 border-t border-[#27272A]/60">
                      <div className="flex items-center justify-between text-[11px] text-[#71717a] font-mono mb-2">
                        <span>Round Outcomes</span>
                        <span>{ev.currentRound > 0 ? `Round ${ev.currentRound} of ${ev.totalRounds}` : `${ev.totalRounds} Rounds`}</span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {ev.roundOutcomes.length === 0 ? (
                          <span className="text-xs text-[#52525b] italic">No rounds played yet</span>
                        ) : (
                          ev.roundOutcomes.map((ro) => {
                            const isResolved = ro.outcome && ro.outcome !== 'VOID';
                            return (
                              <span
                                key={ro.roundNumber}
                                className={cx(
                                  'px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border',
                                  isResolved
                                    ? ro.isCorrect
                                      ? 'bg-[#22C55E]/15 border-[#22C55E]/30 text-[#22C55E]'
                                      : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#EF4444]'
                                    : 'bg-[#27272A]/40 border-[#27272A] text-[#a1a1aa]',
                                )}
                              >
                                R{ro.roundNumber}: {ro.outcome || 'Pending'}
                                {isResolved && (ro.isCorrect ? ' ✓' : ' ✗')}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Metrics Row: Volume, Traders, Accuracy */}
                    <div className="pt-3 border-t border-[#27272A]/60 grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-[#18181c]/60 p-2 rounded-xl border border-[#27272A]/60">
                        <p className="text-[10px] text-[#71717a] font-sans">Volume</p>
                        <p className="text-xs font-bold text-white mt-0.5">{formatPoints(ev.totalVolume, 0)}</p>
                      </div>

                      <div className="bg-[#18181c]/60 p-2 rounded-xl border border-[#27272A]/60">
                        <p className="text-[10px] text-[#71717a] font-sans">Traders</p>
                        <p className="text-xs font-bold text-white mt-0.5">{ev.participantCount}</p>
                      </div>

                      <div className="bg-[#18181c]/60 p-2 rounded-xl border border-[#27272A]/60">
                        <p className="text-[10px] text-[#71717a] font-sans">Accuracy</p>
                        <p
                          className={cx(
                            'text-xs font-bold mt-0.5',
                            hasAccuracy ? 'text-[#EAB308]' : 'text-[#71717a]',
                          )}
                        >
                          {hasAccuracy ? `${Math.round(ev.accuracyRate! * 100)}%` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Drilldown Action Footer */}
                    <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-bold text-[#38BDF8] group-hover:text-white transition-colors">
                      <span>Explore Tournament Analytics</span>
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
