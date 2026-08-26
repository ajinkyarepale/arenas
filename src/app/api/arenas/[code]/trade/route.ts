import { NextResponse } from 'next/server';

import { apiError, notFound, parseBody, rateLimited, requireUser, unauthorized } from '@/lib/api';
import { placeTrade } from '@/lib/engine/trading';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, TRADE_RULE } from '@/lib/rate-limit';
import { joinCodeSchema, placeTradeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const STATUS_BY_REASON: Record<string, number> = {
  'not-participant': 403,
  'no-active-round': 409,
  'round-locked': 409,
  'insufficient-balance': 402,
  'stake-too-small': 422,
  'stake-too-large': 422,
  contention: 409,
};

export async function POST(
  request: Request,
  { params }: { params: { code: string } },
) {
  const user = await requireUser();
  if (!user) return unauthorized();

  const parsedCode = joinCodeSchema.safeParse(params.code);
  if (!parsedCode.success) return notFound('That arena code is not valid.');

  const event = await prisma.event.findUnique({
    where: { code: parsedCode.data },
    select: { id: true, currentRound: true },
  });
  if (!event) return notFound('No arena with that code.');

  // Keyed per user per round, so the budget resets every round and one
  // participant cannot spam the book. The prefix matches what the engine clears
  // when a new round opens.
  const limit = checkRateLimit(
    `trade:${event.id}:${event.currentRound}:${user.id}`,
    TRADE_RULE,
  );
  if (!limit.ok) return rateLimited(limit.retryAfterMs);

  const parsed = await parseBody(request, placeTradeSchema);
  if (!parsed.ok) return parsed.response;

  const result = await placeTrade({
    eventId: event.id,
    userId: user.id,
    side: parsed.data.side,
    stake: parsed.data.stake,
    shares: parsed.data.shares,
  });

  if (!result.ok) {
    return apiError(result.message, STATUS_BY_REASON[result.reason] ?? 400);
  }

  return NextResponse.json({
    trade: result.trade,
    balance: result.balance,
    priceYes: result.priceYes,
    position: result.position,
    tradesRemainingThisRound: limit.remaining,
  });
}
