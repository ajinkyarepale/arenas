import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ArenaControl } from '@/components/admin/arena-control';
import { RoundTimeline, SplitBar } from '@/components/charts';
import { SiteSidebar } from '@/components/site-sidebar';
import { getArenaAnalytics } from '@/lib/analytics';
import { auth, isOrganizer } from '@/lib/auth';
import { formatPoints, formatProbability } from '@/lib/format';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const arena = await prisma.event.findFirst({
    where: {
      OR: [
        { id: params.id },
        { code: params.id },
        { code: `AR-${params.id.replace(/^AR-/, '')}` },
        { code: params.id.replace(/^AR-/, '') },
      ],
    },
    select: { name: true },
  });
  return { title: arena ? `Manage ${arena.name} · Arenas` : 'Manage Arena · Arenas' };
}

export default async function ManageArenaPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/admin/arenas/${params.id}`)}`);
  }
  if (!isOrganizer(session.user.role)) redirect('/dashboard?error=organizer-only');

  const arena = await prisma.event.findFirst({
    where: {
      OR: [
        { id: params.id },
        { code: params.id },
        { code: `AR-${params.id.replace(/^AR-/, '')}` },
        { code: params.id.replace(/^AR-/, '') },
      ],
    },
    select: { id: true, code: true, name: true, organizerId: true },
  });

  // Ownership check.
  if (!arena) notFound();
  if (session.user.role !== 'SUPERADMIN' && arena.organizerId !== session.user.id) {
    notFound();
  }

  const market = await getArenaAnalytics(arena.id);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex antialiased">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen relative pt-16 md:pt-0">
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-30">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="text-[#c4c7c8] hover:text-white flex items-center gap-1 font-['Epilogue'] text-xs transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Back to Arenas</span>
            </Link>
            <div className="h-4 w-px bg-[#27272A]" />
            <span className="font-['Epilogue'] text-xs font-bold text-white tracking-wider uppercase">
              CONTROL PANEL: {arena.name}
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto font-['Epilogue'] text-xs">
            <span className="text-[#c4c7c8]">{session.user.email}</span>
            <Link
              href="/api/auth/signout"
              className="text-white hover:underline font-bold transition-colors"
            >
              Sign out
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Masthead */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#201f1f] border border-[#27272A] font-['Epilogue'] text-[10px] font-bold text-[#22C55E] tracking-widest uppercase mb-2">
                ORGANIZER CONTROL
              </div>
              <h1 className="font-['Geist'] text-3xl md:text-4xl font-bold text-white tracking-tight">
                {arena.name}
              </h1>
              <p className="font-['Geist'] text-sm text-[#c4c7c8] mt-1">
                Real-time tournament operation, round management, outcome resolution, and attendee metrics.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/arenas/${arena.code}/screen`}
                target="_blank"
                className="bg-[#201f1f] text-white border border-[#27272A] px-4 py-2.5 rounded-full font-['Epilogue'] text-xs font-bold hover:bg-[#2a2a2a] transition-all flex items-center gap-1.5 shadow"
              >
                <span className="material-symbols-outlined text-[16px] text-[#22C55E]">desktop_windows</span>
                <span>Big Screen View</span>
              </Link>
              <Link
                href={`/arenas/${arena.code}`}
                target="_blank"
                className="bg-white text-[#2f3131] px-5 py-2.5 rounded-full font-['Epilogue'] text-xs font-bold hover:bg-[#c6c6c7] transition-all shadow"
              >
                Participant View ↗
              </Link>
            </div>
          </div>

          {/* Interactive Arena Control Board */}
          <ArenaControl arenaId={arena.id} code={arena.code} />

          {/* Session Analytics if rounds have resolved */}
          {market.resolvedRounds > 0 && (
            <section className="flex flex-col gap-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-['Geist'] text-xl font-bold text-white">Session Analytics</h2>
                  <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                    Performance and outcome statistics for completed rounds.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1 backdrop-blur-xl">
                  <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">ROUNDS SETTLED</p>
                  <p className="font-['Epilogue'] text-2xl font-bold text-white">{market.resolvedRounds}</p>
                  {market.voidCount > 0 && (
                    <p className="text-[11px] text-[#EAB308]">{market.voidCount} void</p>
                  )}
                </div>

                <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1 backdrop-blur-xl">
                  <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">VOLUME</p>
                  <p className="font-['Epilogue'] text-2xl font-bold text-white">
                    {formatPoints(market.totalVolume, 0)} pts
                  </p>
                  <p className="text-[11px] text-[#8e9192]">{market.totalTrades} trades</p>
                </div>

                <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1 backdrop-blur-xl">
                  <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">CROWD ACCURACY</p>
                  <p className={`font-['Epilogue'] text-2xl font-bold ${
                    market.crowdAccuracy !== null && market.crowdAccuracy > 0.5 ? 'text-[#22C55E]' : 'text-white'
                  }`}>
                    {market.crowdAccuracy !== null ? formatProbability(market.crowdAccuracy, 0) : '—'}
                  </p>
                  <p className="text-[11px] text-[#8e9192]">favourite won this often</p>
                </div>

                <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col gap-1 backdrop-blur-xl">
                  <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">BUSIEST ROUND</p>
                  <p className="font-['Epilogue'] text-2xl font-bold text-white">
                    {market.busiestRound ? `R${market.busiestRound.roundNumber}` : '—'}
                  </p>
                  {market.busiestRound && (
                    <p className="text-[11px] text-[#8e9192]">
                      {formatPoints(market.busiestRound.volume, 0)} pts
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider">
                    Round by Round Timeline
                  </span>
                  <span className="font-['Epilogue'] text-xs text-[#8e9192]">
                    fill height = market YES probability · ✓ = crowd called it
                  </span>
                </div>

                <RoundTimeline rounds={market.rounds} />

                {market.yesCount + market.noCount > 0 && (
                  <div className="border-t border-[#27272A] pt-4">
                    <div className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] uppercase tracking-wider mb-2">
                      Outcome Split
                    </div>
                    <SplitBar
                      left={market.yesCount}
                      right={market.noCount}
                      leftLabel={`${market.yesCount} closed UP`}
                      rightLabel={`${market.noCount} closed DOWN`}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
