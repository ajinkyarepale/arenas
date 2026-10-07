'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell, AppContent } from '@/components/app-shell';
import { SiteSidebar } from '@/components/site-sidebar';
import { SiteNavAuth } from '@/components/site-nav-auth';
import { SwitchButton } from '@/components/ui';
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

  // If a tournament is selected for deep-dive, show the rich tournament analytics view inside standard App layout
  if (selectedArena) {
    return (
      <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
        {/* Sidebar Navigation */}
        <SiteSidebar />

        {/* Main Content Area */}
        <AppShell>
          {/* Top return banner */}
          <header className="sticky top-0 z-30 bg-[rgba(20,20,20,0.85)] border-b border-[#27272A] px-4 sm:px-6 h-16 flex items-center justify-between backdrop-blur-xl">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSelectedArena(null)}
                className="flex items-center gap-1.5 text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white bg-[#201f1f] hover:bg-[#27272A] px-3.5 py-1.5 rounded-full border border-[#27272A] active:scale-95 transition-all shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Back to Overview</span>
              </button>
              <div className="h-4 w-px bg-[#27272A] hidden sm:block" />
              <span className="font-['Epilogue'] text-xs font-bold text-white tracking-wider uppercase truncate hidden sm:inline">
                {selectedArena.name}
              </span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-xs text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-1 rounded-full font-bold">
                {selectedArena.code}
              </span>
              <Link
                href={`/arenas/${selectedArena.code}/screen`}
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#201f1f] hover:bg-[#27272A] border border-[#27272A] text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[15px] text-[#38BDF8]">desktop_windows</span>
                <span>Big Screen ↗</span>
              </Link>
              <SwitchButton size="sm" showLabel={false} />
            </div>
          </header>

          <main className="flex-1 w-full p-4 sm:p-6 md:p-8 flex flex-col gap-6 animate-in fade-in-50 duration-200">
            <TournamentAnalysis
              initialArena={selectedArena}
              hideHeader={true}
              onBack={() => setSelectedArena(null)}
              onSelectView={(view) => {
                if (view === 'live') {
                  window.open(`/arenas/${selectedArena.code}/live`, '_blank');
                } else if (view === 'screen') {
                  window.open(`/arenas/${selectedArena.code}/screen`, '_blank');
                }
              }}
            />
          </main>
        </AppShell>
      </div>
    );
  }

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* Sidebar Navigation */}
      <SiteSidebar />

      {/* Main Content Area */}
      <AppShell>
        {/* Top Header */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div>
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              GLOBAL ANALYTICS
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => void fetchOverview()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#201f1f] hover:bg-[#27272A] text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white border border-[#27272A] transition-all"
              title="Refresh Analytics"
            >
              <span className={cx('text-sm', loading && 'animate-spin')}>↻</span>
              <span>Refresh</span>
            </button>
            <SiteNavAuth />
          </div>
        </header>

        {/* Dashboard Body */}
        <AppContent>
          {/* Header matching Admin Dashboard */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-['Geist'] text-3xl md:text-4xl font-bold text-white tracking-tight">
                Market Analytics
              </h1>
              <p className="font-['Geist'] text-sm text-[#c4c7c8] mt-1">
                Cross-tournament telemetry, crowd accuracy benchmarks, and post-round audit logs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void fetchOverview()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#201f1f] hover:bg-[#2a2a2a] text-xs font-['Epilogue'] font-bold text-white border border-[#27272A] transition-all active:scale-95 shadow-sm"
                title="Refresh Analytics Data"
              >
                <span className={cx('material-symbols-outlined text-[16px] text-[#22C55E]', loading && 'animate-spin')}>
                  refresh
                </span>
                <span>Refresh Data</span>
              </button>
            </div>
          </div>

          {/* Metrics Row matching Admin Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Volume */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Volume</p>
              {data ? (
                <p className="font-['Epilogue'] text-3xl font-bold text-white flex items-baseline gap-1.5">
                  {formatPoints(data.summary.totalVolume, 0)}
                  <span className="text-xs text-[#8e9192] font-normal font-sans">arcs</span>
                </p>
              ) : (
                <div className="h-9 w-32 bg-[#27272A]/70 rounded-lg animate-pulse" />
              )}
            </div>

            {/* Live Arenas */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#22C55E]/40 transition-all">
              <div className="flex items-center justify-between mb-2">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">Live Now</p>
                {data && data.summary.liveEvents > 0 && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]" />
                  </span>
                )}
              </div>
              {data ? (
                <p className="font-['Epilogue'] text-3xl font-bold text-white">{data.summary.liveEvents}</p>
              ) : (
                <div className="h-9 w-16 bg-[#27272A]/70 rounded-lg animate-pulse" />
              )}
            </div>

            {/* Total Predictions */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#38BDF8]/40 transition-all">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Predictions</p>
              {data ? (
                <p className="font-['Epilogue'] text-3xl font-bold text-white">{data.summary.totalPredictions.toLocaleString()}</p>
              ) : (
                <div className="h-9 w-28 bg-[#27272A]/70 rounded-lg animate-pulse" />
              )}
            </div>

            {/* Crowd Accuracy */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-2xl p-5 backdrop-blur-md hover:border-[#22C55E]/40 transition-all">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Crowd Accuracy</p>
              {data ? (
                <p className="font-['Epilogue'] text-3xl font-bold text-[#22C55E]">
                  {data.summary.overallAccuracyRate != null ? `${Math.round(data.summary.overallAccuracyRate * 100)}%` : 'N/A'}
                </p>
              ) : (
                <div className="h-9 w-24 bg-[#27272A]/70 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[rgba(20,20,20,0.7)] p-2 rounded-2xl border border-[#27272A] backdrop-blur-md">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-xl border border-[#27272A]">
              {(['ALL', 'LIVE', 'ENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cx(
                    'px-3.5 py-1.5 rounded-lg text-xs font-["Epilogue"] font-bold transition-all active:scale-95',
                    statusFilter === filter
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 shadow-sm'
                      : 'text-[#c4c7c8] hover:text-white border border-transparent',
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
                className="w-full bg-[#141414] border border-[#27272A] rounded-xl px-4 py-2 text-xs text-white placeholder-[#8e9192] focus:outline-none focus:border-[#22C55E] transition-colors font-['Geist']"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8e9192] hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tournament Cards List matching AdminArenaList Card Style */}
          {loading && !data ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-36 rounded-2xl border border-[#27272A] bg-[#141417]/50 animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#27272A] bg-[#201f1f]/30 p-12 text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-3xl text-[#71717a]">search</span>
              <p className="font-['Geist'] text-base font-bold text-white">No tournaments matched your search</p>
              <p className="font-['Geist'] text-xs text-[#a1a1aa] max-w-sm">
                Try searching for a different keyword or toggle back to All tournaments.
              </p>
            </div>
          ) : (
            <div key={statusFilter} className="flex flex-col gap-4 animate-in fade-in-50 slide-in-from-bottom-2 duration-300">
              {filteredEvents.map((ev) => {
                const isLive = ev.status === 'LIVE';
                const hasAccuracy = ev.accuracyRate != null;

                return (
                  <div
                    key={ev.id}
                    onClick={() => handleOpenEventAnalytics(ev)}
                    className="border border-[#27272A] bg-[rgba(20,20,20,0.7)] hover:border-[#38BDF8]/40 hover:bg-[#18181c] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-5 justify-between items-start md:items-center backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-lg cursor-pointer group"
                  >
                    {/* Left Details Column */}
                    <div className="flex flex-col gap-2.5 w-full md:w-auto flex-1 min-w-0">
                      {/* Top Badges Strip */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isLive ? (
                          <span className="bg-[#201f1f] text-[#22C55E] border border-[#22C55E]/30 px-2.5 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest flex items-center gap-1.5 uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                            LIVE NOW
                          </span>
                        ) : (
                          <span className="bg-[#201f1f] text-[#8e9192] border border-[#27272A] px-2.5 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest uppercase">
                            {ev.status}
                          </span>
                        )}

                        <span className="font-mono text-xs font-bold text-white bg-[#201f1f] border border-[#27272A] px-2.5 py-0.5 rounded-lg">
                          {ev.code}
                        </span>

                        <span className="font-mono text-xs font-bold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2.5 py-0.5 rounded-lg">
                          {ev.asset}
                        </span>

                        {ev.collegeName && (
                          <span className="text-[11px] text-[#8e9192] font-['Geist'] hidden sm:inline">
                            · {ev.collegeName}
                          </span>
                        )}
                      </div>

                      {/* Tournament Title */}
                      <h3 className="font-['Geist'] text-lg sm:text-xl font-bold text-white group-hover:text-[#22C55E] transition-colors tracking-tight truncate">
                        {ev.name}
                      </h3>

                      {/* Telemetry Stats Row matching Admin style */}
                      <div className="flex items-center gap-4 sm:gap-6 flex-wrap text-xs text-[#c4c7c8] font-['Epilogue'] pt-1">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#38BDF8]">paid</span>
                          <strong className="text-white font-mono">{formatPoints(ev.totalVolume, 0)}</strong> arcs Vol
                        </span>

                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#8e9192]">group</span>
                          <strong className="text-white font-mono">{ev.participantCount}</strong> Traders
                        </span>

                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#8e9192]">layers</span>
                          <strong className="text-white font-mono">{ev.totalRounds}</strong> Rounds
                        </span>

                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[16px] text-[#22C55E]">verified</span>
                          <strong className={cx('font-mono', hasAccuracy ? 'text-[#22C55E]' : 'text-[#8e9192]')}>
                            {hasAccuracy ? `${Math.round(ev.accuracyRate! * 100)}% Accuracy` : 'Pending'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Right Action Column */}
                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEventAnalytics(ev);
                        }}
                        className="bg-white text-[#131313] hover:bg-[#e4e4e7] font-['Epilogue'] text-xs font-bold px-5 py-2.5 rounded-full transition-all flex items-center gap-1.5 shadow-md active:scale-95 group-hover:bg-[#22C55E] group-hover:text-[#131313]"
                      >
                        <span>Inspect Analytics</span>
                        <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AppContent>
      </AppShell>
    </div>
  );
}
