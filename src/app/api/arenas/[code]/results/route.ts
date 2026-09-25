import { NextResponse } from 'next/server';

import { notFound, requireUser } from '@/lib/api';
import { computeLeaderboard } from '@/lib/engine/round-engine';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Post-event results: the final leaderboard plus, for a signed-in participant,
 * their own round-by-round history.
 */
export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
    include: { organizer: { select: { name: true } } },
  });
  if (!event) return notFound('No arena with that code.');

  const [leaderboard, rounds] = await Promise.all([
    computeLeaderboard(event.id),
    prisma.round.findMany({
      where: { eventId: event.id, status: 'RESOLVED' },
      orderBy: { roundNumber: 'asc' },
      select: {
        id: true,
        roundNumber: true,
        openPrice: true,
        closePrice: true,
        outcome: true,
        voidReason: true,
        qYes: true,
        qNo: true,
        resolvedAt: true,
      },
    }),
  ]);

  const user = await requireUser();
  let history: Array<{
    roundNumber: number;
    outcome: string | null;
    side: string;
    shares: number;
    cost: number;
    priceAtFill: number;
    payout: number | null;
    pnl: number;
  }> = [];
  let summary: {
    finalBalance: number;
    startingBalance: number;
    pnl: number;
    rank: number;
    roundsTraded: number;
    roundsWon: number;
  } | null = null;

  if (user) {
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: event.id, userId: user.id } },
      select: { id: true, balance: true },
    });

    if (participant) {
      const trades = await prisma.trade.findMany({
        where: { participantId: participant.id },
        orderBy: { createdAt: 'asc' },
        select: {
          side: true,
          shares: true,
          cost: true,
          priceAtFill: true,
          payout: true,
          round: { select: { roundNumber: true, outcome: true } },
        },
      });

      history = trades.map((trade) => ({
        roundNumber: trade.round.roundNumber,
        outcome: trade.round.outcome,
        side: trade.side,
        shares: trade.shares,
        cost: trade.cost,
        priceAtFill: trade.priceAtFill,
        payout: trade.payout,
        pnl: (trade.payout ?? 0) - trade.cost,
      }));

      const roundsTraded = new Set(history.map((h) => h.roundNumber)).size;
      const roundsWon = new Set(
        history.filter((h) => h.pnl > 0).map((h) => h.roundNumber),
      ).size;

      const rank =
        (await prisma.eventParticipant.count({
          where: { eventId: event.id, balance: { gt: participant.balance } },
        })) + 1;

      summary = {
        finalBalance: participant.balance,
        startingBalance: event.startingBalance,
        pnl: participant.balance - event.startingBalance,
        rank,
        roundsTraded,
        roundsWon,
      };
    }
  }

  return NextResponse.json({
    arena: {
      id: event.id,
      code: event.code,
      name: event.name,
      host: event.hostName ?? event.organizer.name,
      asset: event.asset,
      status: event.status,
      totalRounds: event.totalRounds,
      startingBalance: event.startingBalance,
      startedAt: event.startedAt?.toISOString() ?? null,
      endsAt: event.endsAt?.toISOString() ?? null,
    },
    leaderboard,
    rounds,
    history,
    summary,
  });
}
