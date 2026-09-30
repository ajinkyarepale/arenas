import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { EventStatus } from '@/generated/client';

import { AdminArenaList } from '@/components/admin/admin-arena-list';
import { AppShell, AppContent } from '@/components/app-shell';
import { SiteSidebar } from '@/components/site-sidebar';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Organizer Dashboard — Arenas',
  description: 'Manage your prediction market tournaments and monitor live engagement.',
};
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  const now = Date.now();

  const isSuperAdmin = session?.user?.role === 'SUPERADMIN';

  // Fetch only real arenas created for this organizer or all for SUPERADMIN
  const [dbArenas, pendingOrganizersCount] = await Promise.all([
    prisma.event.findMany({
      where:
        isSuperAdmin
          ? {}
          : session?.user?.id
            ? { organizerId: session.user.id }
            : {},
      include: {
        _count: { select: { participants: true, trades: true, rounds: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    isSuperAdmin
      ? prisma.organizerRequest.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
  ]);

  const arenas = dbArenas.map((a) => {
    const isEndedByTime = a.endsAt ? new Date(a.endsAt).getTime() <= now : false;
    const effectiveStatus: EventStatus = a.status === 'ENDED' || isEndedByTime ? 'ENDED' : a.status;

    return {
      id: a.id,
      code: a.code,
      name: a.name,
      asset: a.asset,
      totalRounds: a.totalRounds,
      status: effectiveStatus,
      resolvedOutcome: (a.resolvedOutcome as 'YES' | 'NO' | 'VOID' | null) ?? null,
      resolvedAt: a.resolvedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
      participantCount: a._count.participants,
      predictionCount: a._count.trades,
      endsAt: a.endsAt?.toISOString() ?? null,
    };
  });

  const totalArenas = arenas.length;
  const liveCount = arenas.filter((a) => a.status === 'LIVE').length;
  const totalParticipants = arenas.reduce((sum, a) => sum + a.participantCount, 0);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <AppShell>
        {/* Desktop TopNavBar */}
        <header className="hidden md:flex bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl justify-between items-center h-16 px-6 z-30">
          <div>
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              ORGANIZER DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {isSuperAdmin && (
              <Link
                href="/admin/organizers"
                className="bg-[#202024] hover:bg-[#2a2a30] text-[#c4c7c8] hover:text-white border border-[#27272A] font-['Epilogue'] text-xs font-bold px-3.5 py-2 rounded-full transition-all flex items-center gap-1.5 shadow"
              >
                <span>Approvals</span>
                {pendingOrganizersCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#EF4444] text-[10px] text-white font-mono leading-none">
                    {pendingOrganizersCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href="/admin/arenas/new"
              className="bg-white text-[#2f3131] hover:bg-[#c6c6c7] font-['Epilogue'] text-xs font-bold px-4 py-2 rounded-full transition-all flex items-center gap-1 shadow"
            >
              <span>+ Create Arena</span>
            </Link>
          </div>
        </header>

        {/* Content Container */}
        <AppContent>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-['Geist'] text-3xl md:text-4xl font-bold text-white tracking-tight">
                Your Arenas
              </h1>
              <p className="font-['Geist'] text-sm text-[#c4c7c8] mt-1">
                Manage your prediction market tournaments, generate QR codes, and monitor live trading.
              </p>
            </div>
            <Link
              href="/admin/arenas/new"
              className="bg-white text-[#2f3131] font-['Epilogue'] text-sm font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-[#c6c6c7] transition-colors self-start md:self-auto shadow-lg"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Arena
            </Link>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Arenas</p>
              <p className="font-['Epilogue'] text-3xl font-bold text-white">{totalArenas}</p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase">Live Now</p>
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
              </div>
              <p className="font-['Epilogue'] text-3xl font-bold text-white">{liveCount}</p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">Total Participants</p>
              <p className="font-['Epilogue'] text-3xl font-bold text-white">{totalParticipants}</p>
            </div>
            <div className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 backdrop-blur-md">
              <p className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] uppercase mb-2">System Status</p>
              <p className="font-['Epilogue'] text-3xl font-bold text-[#22C55E]">ONLINE</p>
            </div>
          </div>

          {/* Arenas List with Interactive QR & Share Actions */}
          <AdminArenaList arenas={arenas} />
        </AppContent>
      </AppShell>
    </div>
  );
}
