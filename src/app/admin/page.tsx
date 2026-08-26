import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';

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

  // If user is logged in, fetch their events; otherwise fetch demo events
  const arenas = await prisma.event.findMany({
    where: session?.user?.role === 'SUPERADMIN' ? {} : session?.user?.id ? { organizerId: session.user.id } : {},
    include: {
      _count: { select: { participants: true, rounds: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totalArenas = arenas.length;
  const liveCount = arenas.filter((a) => a.status === 'LIVE').length;
  const totalParticipants = arenas.reduce((sum, a) => sum + a._count.participants, 0);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="bg-[rgba(20,20,20,0.7)] top-0 sticky border-b border-[#27272A] backdrop-blur-xl flex justify-between items-center h-16 px-6 z-40">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
          </div>
          <div className="hidden md:block">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              ORGANIZER DASHBOARD
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <Link
              href="/admin/arenas/new"
              className="px-4 py-2 rounded-full bg-white text-[#2f3131] font-['Epilogue'] text-xs font-bold hover:bg-[#c6c6c7] transition-colors shadow"
            >
              + Create Arena
            </Link>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 md:p-12 max-w-[1280px] mx-auto w-full flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="font-['Geist'] text-3xl md:text-4xl font-bold text-white tracking-tight">
                Your Arenas
              </h1>
              <p className="font-['Geist'] text-sm text-[#c4c7c8] mt-1">
                Manage your prediction market tournaments and monitor live engagement.
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

          {/* Arenas List */}
          <div className="flex flex-col gap-4">
            {arenas.length === 0 ? (
              <div className="rounded-xl border border-[#27272A] bg-[#201f1f]/40 p-12 text-center flex flex-col items-center">
                <h3 className="font-['Geist'] text-lg font-bold text-white">No arenas hosted yet</h3>
                <p className="text-sm text-[#c4c7c8] mt-1 max-w-sm">
                  Click New Arena above to create your first prediction market tournament.
                </p>
              </div>
            ) : (
              arenas.map((arena) => (
                <div
                  key={arena.id}
                  className="bg-[rgba(20,20,20,0.7)] border border-[#27272A] rounded-xl p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center hover:border-[#444748] transition-colors backdrop-blur-md"
                >
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-3">
                      {arena.status === 'LIVE' ? (
                        <span className="bg-[#201f1f] text-[#22C55E] border border-[#22C55E]/30 px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" /> LIVE
                        </span>
                      ) : arena.status === 'LOBBY' ? (
                        <span className="bg-[#201f1f] text-[#EAB308] border border-[#EAB308]/30 px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest">
                          LOBBY
                        </span>
                      ) : (
                        <span className="bg-[#201f1f] text-[#c4c7c8] border border-[#27272A] px-2 py-0.5 rounded-full font-['Epilogue'] text-[10px] font-bold tracking-widest">
                          ENDED
                        </span>
                      )}
                      <span className="bg-[#201f1f] border border-[#27272A] px-2 py-0.5 rounded-full font-['Epilogue'] text-[11px] text-[#c4c7c8] uppercase">
                        {arena.code}
                      </span>
                    </div>

                    <h3 className="font-['Geist'] text-xl font-medium text-white">{arena.name}</h3>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-['Epilogue'] text-xs text-[#c4c7c8]">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">toll</span> {arena.asset}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">layers</span> {arena.totalRounds} Rounds
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">groups</span> {arena._count.participants} Players
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-end mt-2 md:mt-0">
                    <Link
                      href={`/arenas/${arena.code}/projector`}
                      className="flex items-center justify-center w-10 h-10 rounded-full border border-[#27272A] text-[#c4c7c8] hover:text-white hover:bg-[#201f1f] transition-colors"
                      title="Auditorium Big Screen View"
                    >
                      <span className="material-symbols-outlined text-xl">desktop_windows</span>
                    </Link>
                    <Link
                      href={`/admin/arenas/${arena.code}`}
                      className="bg-[#201f1f] border border-[#27272A] text-white font-['Epilogue'] text-xs font-semibold px-5 py-2.5 rounded-full hover:bg-[#2a2a2a] transition-all whitespace-nowrap"
                    >
                      Control Panel
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
