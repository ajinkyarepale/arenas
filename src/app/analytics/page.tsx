'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell, AppContent } from '@/components/app-shell';
import { SiteSidebar } from '@/components/site-sidebar';
import { SiteNavAuth } from '@/components/site-nav-auth';
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
      <div className="min-h-screen bg-[#131313] text-[#e5e2e1] font-['Geist']">
        {/* Top return banner */}
        <div className="sticky top-0 z-40 bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] px-4 sm:px-8 py-3 flex items-center justify-between backdrop-blur-xl">
          <button
            onClick={() => setSelectedArena(null)}
            className="flex items-center gap-2 text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white bg-[#201f1f] hover:bg-[#27272A] px-3.5 py-1.5 rounded-full border border-[#27272A] transition-all"
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
              className="text-xs text-[#c4c7c8] hover:text-white hover:underline hidden sm:inline"
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
          {/* Hero Title */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-['Geist'] text-2xl sm:text-3xl md:text-4xl font-semibold text-white tracking-tight">
                Event Overview &amp; Intelligence
              </h1>
              {/* Mobile Refresh Button */}
              <button
                type="button"
                onClick={() => void fetchOverview()}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#201f1f] hover:bg-[#27272A] text-xs font-['Epilogue'] font-bold text-[#c4c7c8] hover:text-white border border-[#27272A] transition-all shrink-0"
                title="Refresh Analytics"
              >
                <span className={cx('text-sm', loading && 'animate-spin')}>↻</span>
                <span>Refresh</span>
              </button>
            </div>
            <p className="font-['Geist'] text-xs sm:text-sm text-[#c4c7c8] leading-relaxed max-w-2xl">
              Aggregated market telemetry across all prediction tournaments. Click any tournament card below to inspect its round-by-round calibration curve, PnL tape, and crowd sentiment.
            </p>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Volume Traded */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                Total Volume Traded
              </p>
              <p className="font-mono text-3xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
                {data ? formatPoints(data.summary.totalVolume, 0) : '—'}
                <span className="text-xs text-[#8e9192] font-normal font-sans">arcs</span>
              </p>
            </div>

            {/* Total Predictions / Trades */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                Total Predictions
              </p>
              <p className="font-mono text-3xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
                {data ? data.summary.totalPredictions.toLocaleString() : '—'}
                <span className="text-xs text-[#8e9192] font-normal font-sans">trades</span>
              </p>
            </div>

            {/* Tournaments Hosted */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">
                  Tournaments Hosted
                </p>
                {data && data.summary.liveEvents > 0 && (
                  <span className="flex items-center gap-1.5 text-[#22C55E] text-[10px] font-bold font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    {data.summary.liveEvents} LIVE
                  </span>
                )}
              </div>
              <p className="font-mono text-3xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
                {data ? data.summary.totalEvents : '—'}
                <span className="text-xs text-[#8e9192] font-normal font-sans">arenas</span>
              </p>
            </div>

            {/* Overall Accuracy / Calibration */}
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">
                Crowd Accuracy
              </p>
              <p className="font-mono text-3xl font-bold text-[#22C55E] tracking-tight flex items-baseline gap-1.5">
                {data && data.summary.overallAccuracyRate != null
                  ? `${Math.round(data.summary.overallAccuracyRate * 100)}%`
                  : 'N/A'}
                <span className="text-xs text-[#8e9192] font-normal font-sans">consensus</span>
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[rgba(20,20,20,0.7)] p-2 rounded-xl border border-[#27272A] backdrop-blur-md">
            {/* Status Pills */}
            <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-lg border border-[#27272A]">
              {(['ALL', 'LIVE', 'ENDED'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={cx(
                    'px-3.5 py-1.5 rounded-md text-xs font-["Epilogue"] font-bold transition-all',
                    statusFilter === filter
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
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
                className="w-full bg-[#141414] border border-[#27272A] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#8e9192] focus:outline-none focus:border-white transition-colors font-['Geist']"
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

          {/* Tournaments Grid */}
          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-xl border border-[#27272A] bg-[#141417]/50 animate-pulse" />
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-[#27272A] text-center gap-3 bg-[rgba(20,20,20,0.4)]">
              <span className="material-symbols-outlined text-3xl text-[#71717a]">search</span>
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
                    className="group flex flex-col justify-between p-5 rounded-xl border border-[#27272A] bg-[rgba(20,20,20,0.7)] hover:bg-[#18181b] hover:border-[#3f3f46] transition-colors cursor-pointer"
                  >
                    {/* Top Row: Code Pill & Status Badge */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#201f1f] border border-[#27272A] font-mono text-xs font-bold text-white tracking-wider">
                          {ev.code}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#c4c7c8] bg-[#201f1f] border border-[#27272A] px-2 py-0.5 rounded-md">
                          {ev.asset}
                        </span>
                      </div>

                      {isLive ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] font-['Epilogue'] text-[10px] font-bold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                          LIVE NOW
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] text-[#8e9192] font-mono text-[10px] font-semibold uppercase">
                          {ev.status}
                        </span>
                      )}
                    </div>

                    {/* Tournament Title & College */}
                    <div className="mb-4">
                      <h3 className="font-['Geist'] text-base font-bold text-white group-hover:text-[#22C55E] transition-colors tracking-tight line-clamp-1">
                        {ev.name}
                      </h3>
                      <p className="font-['Geist'] text-xs text-[#c4c7c8] mt-0.5">
                        {ev.collegeName || ev.organizerName || 'Campus FinTech Event'}
                      </p>
                    </div>

                    {/* Mini Round Calibration Strip */}
                    <div className="mb-4 pt-3 border-t border-[#27272A]/60">
                      <div className="flex items-center justify-between text-[11px] text-[#71717a] font-mono mb-2">
                        <span>Round Calibration</span>
                        <span>
                          {ev.roundOutcomes.length === 0
                            ? `${ev.totalRounds} Rounds`
                            : `${ev.roundOutcomes.filter((ro) => ro.isCorrect).length}/${ev.roundOutcomes.filter((ro) => ro.outcome && ro.outcome !== 'VOID').length || ev.totalRounds} Won`}
                        </span>
                      </div>

                      {ev.roundOutcomes.length === 0 ? (
                        <div className="h-4 flex items-center">
                          <span className="text-xs text-[#52525b] italic">No rounds played yet</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 h-4">
                          {ev.roundOutcomes.map((ro) => {
                            const isResolved = ro.outcome && ro.outcome !== 'VOID';
                            return (
                              <div
                                key={ro.roundNumber}
                                title={`Round ${ro.roundNumber}: ${ro.outcome || 'Pending'}${isResolved ? (ro.isCorrect ? ' (WON)' : ' (MISS)') : ''}`}
                                className={cx(
                                  'flex-1 h-2 rounded-full transition-all duration-200 cursor-help',
                                  isResolved
                                    ? ro.isCorrect
                                      ? 'bg-[#22C55E]'
                                      : 'bg-[#EF4444]'
                                    : 'bg-[#27272A]/80 border border-[#3f3f46]',
                                )}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Metrics Row: Volume, Traders, Accuracy */}
                    <div className="pt-3 border-t border-[#27272A]/60 grid grid-cols-3 gap-2 text-center font-mono">
                      <div className="bg-[#141414] p-2 rounded-lg border border-[#27272A]">
                        <p className="text-[10px] text-[#71717a] font-sans">Volume</p>
                        <p className="text-xs font-bold text-white mt-0.5">{formatPoints(ev.totalVolume, 0)}</p>
                      </div>

                      <div className="bg-[#141414] p-2 rounded-lg border border-[#27272A]">
                        <p className="text-[10px] text-[#71717a] font-sans">Traders</p>
                        <p className="text-xs font-bold text-white mt-0.5">{ev.participantCount}</p>
                      </div>

                      <div className="bg-[#141414] p-2 rounded-lg border border-[#27272A]">
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
                    <div className="mt-4 pt-2.5 flex items-center justify-between text-xs font-['Epilogue'] font-bold text-[#c4c7c8] group-hover:text-[#22C55E] transition-colors border-t border-[#27272A]/40">
                      <span>Explore Tournament Analytics</span>
                      <span className="transform group-hover:translate-x-1 transition-transform">→</span>
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
