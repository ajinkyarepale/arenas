import { NextResponse } from 'next/server';

import { notFound } from '@/lib/api';
import { findArenaByCode } from '@/lib/engine/snapshot';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Returns recent participant trades for the current round of an arena.
 * Used for live YES/NO crowd graphs and tape distributions.
 */
export async function GET(
  _request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('Invalid arena code.');

  const event = await findArenaByCode(parsed.data);
  if (!event) return notFound('No arena with that code.');

  const round = await prisma.round.findUnique({
    where: {
      eventId_roundNumber: {
        eventId: event.id,
        roundNumber: event.currentRound,
      },
    },
  });

  if (!round) {
    return NextResponse.json({ trades: [] });
  }

  const trades = await prisma.trade.findMany({
    where: { roundId: round.id },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      side: true,
      shares: true,
      cost: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    trades: trades.map((t) => ({
      id: t.id,
      side: t.side,
      shares: t.shares,
      cost: t.cost,
      at: t.createdAt.toISOString(),
    })),
  });
}
