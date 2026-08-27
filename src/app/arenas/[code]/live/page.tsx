import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { LiveArena } from '@/components/arena/live-arena';
import { auth } from '@/lib/auth';
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
    `Trading Terminal for ${arena.name} (${arena.code}) · Asset: ${arena.asset}. Live binary prediction market.`;

  return {
    title: `${arena.name} (${arena.code}) — Live Market`,
    description,
    openGraph: {
      title: `${arena.name} — Live Prediction Terminal`,
      description,
      url: `/arenas/${arena.code}/live`,
      siteName: 'Arenas Markets',
      type: 'website',
    },
    robots: { index: false, follow: false },
  };
}

export default async function LiveArenaPage({ params }: { params: { code: string } }) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) notFound();

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/arenas/${parsed.data}/live`)}`);
  }

  const arena = await findArenaByCode(parsed.data);
  if (!arena) notFound();

  // The join gate. Middleware confirms there is a session; this confirms the
  // session belongs to somebody who actually entered this arena's code.
  const participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: arena.id, userId: session.user.id } },
    select: { id: true },
  });
  if (!participant) {
    redirect(`/arenas/${arena.code}`);
  }

  return <LiveArena initialArena={toPublicInfo(arena)} />;
}
