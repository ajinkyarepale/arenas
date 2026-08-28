import { NextResponse } from 'next/server';

import { apiError, forbidden, notFound, parseBody, requireOrganizer, unauthorized } from '@/lib/api';
import { resolveRound } from '@/lib/engine/round-engine';
import { prisma } from '@/lib/prisma';
import { emitToArena } from '@/lib/realtime/bus';
import { forceResolveSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Force-resolve a round or the entire Arena.
 *
 * An Arena ending does not automatically mean its outcome is known.
 * After an Arena finishes, the organizer can resolve it as YES, NO, or VOID.
 * The resolution is recorded with timestamps and calculates participant results.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, allowed } = await requireOrganizer();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Only organizers can manage arenas.');

  const arena = await prisma.event.findFirst({
    where: {
      OR: [
        { id: params.id },
        { code: params.id },
        { code: `AR-${params.id.replace(/^AR-/, '')}` },
        { code: params.id.replace(/^AR-/, '') },
      ],
    },
  });
  if (!arena) return notFound('No such arena.');
  if (user.role !== 'SUPERADMIN' && arena.organizerId !== user.id) {
    return notFound('No such arena.');
  }

  const parsed = await parseBody(request, forceResolveSchema);
  if (!parsed.ok) return parsed.response;

  // Case 1: Resolve the entire Arena
  if (parsed.data.resolveArena || !parsed.data.roundId) {
    const resolvedAt = new Date();

    // 1. Update the Event record
    const updatedArena = await prisma.event.update({
      where: { id: arena.id },
      data: {
        resolvedOutcome: parsed.data.outcome,
        resolvedAt,
        resolvedById: user.id,
        status: 'ENDED',
      },
    });

    // 2. Resolve all active or pending rounds if not yet resolved
    const rounds = await prisma.round.findMany({
      where: { eventId: arena.id, status: { not: 'RESOLVED' } },
      select: { id: true },
    });

    for (const round of rounds) {
      await resolveRound(round.id, {
        forcedOutcome: parsed.data.outcome,
        reason:
          parsed.data.reason?.trim() ||
          `Arena resolved as ${parsed.data.outcome} by organizer ${user.name ?? ''}`,
      });
    }

    emitToArena(arena.id, 'arena', {
      status: 'ENDED',
      currentRound: updatedArena.currentRound,
      totalRounds: updatedArena.totalRounds,
      endedAt: updatedArena.endsAt?.toISOString() ?? resolvedAt.toISOString(),
    });

    return NextResponse.json({
      resolved: true,
      arenaId: arena.id,
      outcome: parsed.data.outcome,
      resolvedAt: resolvedAt.toISOString(),
    });
  }

  // Case 2: Resolve a specific Round
  const round = await prisma.round.findUnique({
    where: { id: parsed.data.roundId },
    select: { id: true, eventId: true, status: true, roundNumber: true },
  });
  if (!round || round.eventId !== arena.id) {
    return notFound('That round is not part of this arena.');
  }
  if (round.status === 'RESOLVED') {
    return apiError('That round has already been settled.', 409);
  }

  const resolved = await resolveRound(round.id, {
    forcedOutcome: parsed.data.outcome,
    reason:
      parsed.data.reason?.trim() ||
      `Round ${round.roundNumber} resolved manually by ${user.name ?? 'the organizer'}`,
  });

  if (!resolved) {
    return apiError('That round could not be resolved.', 409);
  }

  return NextResponse.json({ resolved: true, roundId: round.id, outcome: parsed.data.outcome });
}
