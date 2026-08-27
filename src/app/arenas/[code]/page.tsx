import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';

import { JoinArena } from '@/components/arena/join-arena';
import { SiteNavAuth } from '@/components/site-nav-auth';
import { SiteSidebar } from '@/components/site-sidebar';
import { authOptions } from '@/lib/auth';
import { findArenaByCode, toPublicInfo } from '@/lib/engine/snapshot';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return { title: 'Arena · Arenas' };
  const arena = await findArenaByCode(parsed.data);
  if (!arena) return { title: 'Arena Not Found · Arenas' };

  const description =
    arena.description ||
    `Join ${arena.name} (${arena.code}) — Live binary prediction market for ${arena.asset}. Predict YES or NO in real-time.`;

  return {
    title: `${arena.name} (${arena.code}) · Arenas`,
    description,
    openGraph: {
      title: `${arena.name} | Binary Prediction Market`,
      description,
      url: `/arenas/${arena.code}`,
      siteName: 'Arenas Markets',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${arena.name} (${arena.code})`,
      description,
    },
  };
}

export default async function ArenaJoinPage({ params }: { params: { code: string } }) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) notFound();

  const arena = await findArenaByCode(parsed.data);
  if (!arena) notFound();

  const session = await getServerSession(authOptions);
  const info = toPublicInfo(arena);

  const participant = session?.user?.id
    ? await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId: arena.id, userId: session.user.id } },
        select: { id: true, balance: true },
      })
    : null;

  return (
    <div className="bg-[#131313] text-[#e5e2e1] font-['Geist'] min-h-screen flex">
      {/* SideNavBar */}
      <SiteSidebar />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        {/* TopNavBar */}
        <header className="flex justify-between items-center h-16 px-6 top-0 sticky bg-[rgba(20,20,20,0.7)] border-b border-[#27272A] backdrop-blur-xl z-40">
          <div className="flex items-center gap-2 md:hidden">
            <span className="font-['Geist'] text-2xl font-black text-white">Arenas</span>
          </div>
          <div className="hidden md:block">
            <span className="font-['Epilogue'] text-xs font-bold text-[#c4c7c8] tracking-wider uppercase">
              JOIN TOURNAMENT
            </span>
          </div>
          <div className="ml-auto">
            <SiteNavAuth />
          </div>
        </header>

        {/* Page Canvas: Join Tournament */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
          {/* Atmospheric background element */}
          <div className="absolute inset-0 pointer-events-none opacity-30 flex items-center justify-center overflow-hidden">
            <div className="w-[800px] h-[800px] rounded-full bg-[#2a2a2a] blur-[100px] -translate-y-1/4" />
          </div>

          {/* Gatekeeper Card matching screen.png */}
          <div className="glass-panel border border-[#27272A] bg-[rgba(20,20,20,0.7)] backdrop-blur-xl rounded-2xl w-full max-w-md relative z-10 p-8 shadow-2xl flex flex-col gap-6">
            {/* Header */}
            <div className="text-center flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-[#201f1f] border border-[#27272A] flex items-center justify-center mb-2 shadow-inner">
                <span className="material-symbols-outlined text-4xl text-white">vpn_key</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#201f1f] border border-[#27272A] mb-2">
                <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="font-['Epilogue'] text-[11px] font-bold text-[#c4c7c8] tracking-widest uppercase">
                  {arena.status === 'LIVE'
                    ? 'LIVE TOURNAMENT'
                    : arena.status === 'LOBBY'
                    ? 'UPCOMING LOBBY'
                    : 'ENDED TOURNAMENT'}
                </span>
              </div>
              <h2 className="font-['Geist'] text-2xl md:text-3xl font-semibold text-white">
                {info.name}
              </h2>
              <p className="font-['Geist'] text-xs text-[#c4c7c8]">
                Hosted by <span className="text-white font-medium">@{info.hostName ?? info.organizerName}</span>
              </p>
            </div>

            {/* Interactive Join Flow */}
            <JoinArena
              arenaCode={arena.code}
              defaultCode={arena.code}
              isLoggedIn={Boolean(session?.user)}
              userName={session?.user?.name ?? ''}
              isAlreadyJoined={Boolean(participant)}
            />
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full mt-auto flex justify-between items-center py-6 px-12 border-t border-[#27272A] bg-[#131313] text-[#c4c7c8] text-xs">
          <p>© 2024 Arenas Markets. All rights reserved.</p>
          <div className="flex gap-6 font-['Epilogue'] text-[11px]">
            <Link href="/guide" className="hover:text-white underline">Legal</Link>
            <Link href="/guide" className="hover:text-white underline">Privacy</Link>
            <Link href="/guide" className="hover:text-white underline">Terms</Link>
            <Link href="/guide" className="hover:text-white underline">Docs</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
