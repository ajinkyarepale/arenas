import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * The public arena directory — the same data behind /markets and /arenas.
 *
 * Anyone may browse what is scheduled; the join code is only needed to enter.
 * DRAFT arenas are excluded so an organizer can prepare an event without it
 * appearing on the public calendar before they are ready.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() ?? '';
  const status = url.searchParams.get('status');

  const statusFilter: Prisma.EventWhereInput =
    status === 'LIVE' || status === 'LOBBY' || status === 'ENDED'
      ? { status }
      : { status: { in: ['LOBBY', 'LIVE', 'ENDED'] } };

  const events = await prisma.event.findMany({
    where: {
      ...statusFilter,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' as const } },
              { hostName: { contains: query, mode: 'insensitive' as const } },
              { asset: { contains: query, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: 'asc' }, { scheduledFor: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      hostName: true,
      asset: true,
      roundDurationSec: true,
      totalRounds: true,
      currentRound: true,
      startingBalance: true,
      status: true,
      scheduledFor: true,
      startedAt: true,
      endsAt: true,
      organizer: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  });

  // Tell a signed-in user which of these they are already in, so the list can
  // offer "Enter" instead of "Join".
  const user = await requireUser();
  let joinedIds: string[] = [];
  if (user) {
    const joined = await prisma.eventParticipant.findMany({
      where: { userId: user.id, eventId: { in: events.map((e) => e.id) } },
      select: { eventId: true },
    });
    joinedIds = joined.map((j) => j.eventId);
  }

  return NextResponse.json({
    arenas: events.map((event) => ({
      id: event.id,
      code: event.code,
      name: event.name,
      description: event.description,
      host: event.hostName ?? event.organizer.name,
      asset: event.asset,
      roundDurationSec: event.roundDurationSec,
      totalRounds: event.totalRounds,
      currentRound: event.currentRound,
      startingBalance: event.startingBalance,
      status: event.status,
      scheduledFor: event.scheduledFor?.toISOString() ?? null,
      startedAt: event.startedAt?.toISOString() ?? null,
      endsAt: event.endsAt?.toISOString() ?? null,
      participantCount: event._count.participants,
      joined: joinedIds.includes(event.id),
    })),
  });
}
