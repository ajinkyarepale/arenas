import { NextResponse } from 'next/server';

import { apiError, notFound, rateLimited, requireUser, unauthorized } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, JOIN_RULE } from '@/lib/rate-limit';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Join an arena with its code.
 *
 * The rate limit here is the practical defence against someone sitting in the
 * corner of the room typing guesses: a few attempts a minute against a 25^6
 * code space gets nowhere. The code is not a secret, it is a door.
 */
export async function POST(
  request: Request,
  { params }: { params: { code: string } },
) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const limit = checkRateLimit(`join:${user.id}`, JOIN_RULE);
  if (!limit.ok) return rateLimited(limit.retryAfterMs);

  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startingBalance: true,
    },
  });
  if (!event) return notFound('No arena with that code.');

  if (event.status === 'DRAFT') {
    return apiError('This arena has not opened yet.', 409);
  }
  if (event.status === 'ENDED') {
    return apiError('This arena has already finished.', 409);
  }

  // Idempotent: re-joining returns the existing participant rather than
  // resetting anyone's balance. Someone tapping "Join" twice on a flaky phone
  // connection must not get a fresh bankroll.
  const participant = await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId: event.id, userId: user.id } },
    create: {
      eventId: event.id,
      userId: user.id,
      balance: event.startingBalance,
    },
    update: {},
    select: { id: true, balance: true, joinedAt: true },
  });

  return NextResponse.json({
    joined: true,
    arena: { id: event.id, code: event.code, name: event.name, status: event.status },
    participant,
  });
}
