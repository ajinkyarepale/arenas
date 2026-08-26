import { NextResponse } from 'next/server';

import { apiError, forbidden, notFound, parseBody, requireOrganizer, unauthorized } from '@/lib/api';
import { resolveRound } from '@/lib/engine/round-engine';
import { prisma } from '@/lib/prisma';
import { forceResolveSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Force-resolve a round.
 *
 * The escape hatch for when the price feed dies mid-event and a room full of
 * people is waiting. The organizer can call the round manually, or void it and
 * refund everyone. Voiding is the honest default when nobody can agree what the
 * close was.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const { user, allowed } = await requireOrganizer();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Only organizers can manage arenas.');

  const arena = await prisma.event.findUnique({ where: { id: params.id } });
  if (!arena) return notFound('No such arena.');
  if (user.role !== 'SUPERADMIN' && arena.organizerId !== user.id) {
    return notFound('No such arena.');
  }

  const parsed = await parseBody(request, forceResolveSchema);
  if (!parsed.ok) return parsed.response;

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
