import type { Prisma } from '@/generated/client';
import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/api';
import { priceYes as lmsrPriceYes } from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * The public arena directory — the same data behind /markets and /arenas.
 *
 * All finished events automatically appear in the Finished section based on
 * either status === 'ENDED' or their scheduled/actual end time elapsed.
 * Includes real YES/NO prediction ratios calculated directly from participant orders.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q')?.trim() ?? '';
    const status = url.searchParams.get('status');

    const now = Date.now();

  const events = await prisma.event.findMany({
    where: {
      status: { in: ['LOBBY', 'LIVE', 'ENDED'] },
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
      marketCategory: true,
      question: true,
      resolutionCriteria: true,
      asset: true,
      roundDurationSec: true,
      totalRounds: true,
      currentRound: true,
      startingBalance: true,
      liquidityParamB: true,
      status: true,
      scheduledFor: true,
      startedAt: true,
      endsAt: true,
      resolvedOutcome: true,
      resolvedAt: true,
      createdAt: true,
      organizer: { select: { name: true } },
      _count: { select: { participants: true, trades: true } },
      rounds: {
        orderBy: { roundNumber: 'desc' },
        take: 1,
        select: {
          id: true,
          roundNumber: true,
          question: true,
          status: true,
          qYes: true,
          qNo: true,
          _count: { select: { trades: true } },
        },
      },
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

  const mapped = events.map((event) => {
    const isEndedByTime = event.endsAt ? new Date(event.endsAt).getTime() <= now : false;
    const effectiveStatus = event.status === 'ENDED' || isEndedByTime ? 'ENDED' : event.status;

    const latestRound = event.rounds[0] ?? null;
    const tradeCount = latestRound?._count.trades ?? 0;
    const hasPredictions = tradeCount > 0 || (latestRound && (latestRound.qYes > 0 || latestRound.qNo > 0));

    let priceYes: number | null = null;
    let yesPercent: number | null = null;
    let noPercent: number | null = null;

    if (hasPredictions && latestRound) {
      priceYes = lmsrPriceYes(
        { qYes: latestRound.qYes, qNo: latestRound.qNo },
        event.liquidityParamB,
      );
      const roundedYes = Math.round(priceYes * 100);
      yesPercent = Math.max(1, Math.min(99, roundedYes));
      noPercent = 100 - yesPercent;
    }

    return {
      id: event.id,
      code: event.code,
      name: event.name,
      description: event.description,
      host: event.hostName ?? event.organizer.name,
      marketCategory: event.marketCategory,
      question: latestRound?.question || event.question || null,
      resolutionCriteria: event.resolutionCriteria || null,
      asset: event.asset,
      roundDurationSec: event.roundDurationSec,
      totalRounds: event.totalRounds,
      currentRound: event.currentRound,
      startingBalance: event.startingBalance,
      liquidityParamB: event.liquidityParamB,
      status: effectiveStatus,
      resolvedOutcome: event.resolvedOutcome ?? null,
      resolvedAt: event.resolvedAt?.toISOString() ?? null,
      createdAt: event.createdAt.toISOString(),
      scheduledFor: event.scheduledFor?.toISOString() ?? null,
      startedAt: event.startedAt?.toISOString() ?? null,
      endsAt: event.endsAt?.toISOString() ?? null,
      participantCount: event._count.participants,
      predictionCount: event._count.trades,
      joined: joinedIds.includes(event.id),
      prediction: {
        hasPredictions: Boolean(hasPredictions),
        tradeCount,
        priceYes,
        yesPercent,
        noPercent,
        qYes: latestRound?.qYes ?? 0,
        qNo: latestRound?.qNo ?? 0,
      },
    };
  });

  const filtered = status
    ? mapped.filter((a) => (status === 'all' ? true : a.status === status))
    : mapped;

    return NextResponse.json({
      arenas: filtered,
    });
  } catch (error) {
    console.error('[/api/arenas] Failed to load arenas:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load arenas',
        arenas: [],
      },
      { status: 500 },
    );
  }
}
