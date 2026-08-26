import { prisma } from '@/lib/prisma';

/**
 * A user's cross-arena profile: every arena they have joined plus career stats.
 *
 * Shared by the dashboard page (server-rendered) and GET /api/me, so the two can
 * never drift apart.
 *
 * Win rate is measured per round rather than per arena — in a twelve round event
 * most people care how often they called the candle right, not whether they
 * topped one leaderboard.
 */

export interface ProfileArena {
  participantId: string;
  balance: number;
  joinedAt: string;
  rank: number;
  participantCount: number;
  pnl: number;
  roundsTraded: number;
  roundsWon: number;
  bestRound: { roundNumber: number; pnl: number } | null;
  arena: {
    id: string;
    code: string;
    name: string;
    asset: string;
    status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'ENDED';
    totalRounds: number;
    currentRound: number;
    startingBalance: number;
    host: string;
    scheduledFor: string | null;
    startedAt: string | null;
    endsAt: string | null;
  };
}

export interface ProfileStats {
  arenasPlayed: number;
  roundsTraded: number;
  roundsWon: number;
  winRate: number | null;
  bestRound: { pnl: number; arenaName: string } | null;
  podiums: number;
}

export interface Profile {
  stats: ProfileStats;
  arenas: ProfileArena[];
}

export async function getProfile(userId: string): Promise<Profile> {
  const participations = await prisma.eventParticipant.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    select: {
      id: true,
      balance: true,
      joinedAt: true,
      event: {
        select: {
          id: true,
          code: true,
          name: true,
          asset: true,
          status: true,
          totalRounds: true,
          currentRound: true,
          startingBalance: true,
          hostName: true,
          scheduledFor: true,
          startedAt: true,
          endsAt: true,
          organizer: { select: { name: true } },
        },
      },
    },
  });

  const arenas: ProfileArena[] = await Promise.all(
    participations.map(async (participation) => {
      const [ahead, participantCount, trades] = await Promise.all([
        prisma.eventParticipant.count({
          where: { eventId: participation.event.id, balance: { gt: participation.balance } },
        }),
        prisma.eventParticipant.count({ where: { eventId: participation.event.id } }),
        prisma.trade.findMany({
          where: { participantId: participation.id, settledAt: { not: null } },
          select: {
            cost: true,
            payout: true,
            round: { select: { roundNumber: true } },
          },
        }),
      ]);

      // Collapse each round's trades into a single net result.
      const byRound = new Map<number, number>();
      for (const trade of trades) {
        const pnl = (trade.payout ?? 0) - trade.cost;
        byRound.set(
          trade.round.roundNumber,
          (byRound.get(trade.round.roundNumber) ?? 0) + pnl,
        );
      }

      const roundResults = Array.from(byRound.entries()).map(([roundNumber, pnl]) => ({
        roundNumber,
        pnl,
      }));

      const bestRound = roundResults.reduce<{ roundNumber: number; pnl: number } | null>(
        (best, current) => (best === null || current.pnl > best.pnl ? current : best),
        null,
      );

      return {
        participantId: participation.id,
        balance: participation.balance,
        joinedAt: participation.joinedAt.toISOString(),
        rank: ahead + 1,
        participantCount,
        pnl: participation.balance - participation.event.startingBalance,
        roundsTraded: roundResults.length,
        roundsWon: roundResults.filter((r) => r.pnl > 0).length,
        bestRound,
        arena: {
          id: participation.event.id,
          code: participation.event.code,
          name: participation.event.name,
          asset: participation.event.asset,
          status: participation.event.status,
          totalRounds: participation.event.totalRounds,
          currentRound: participation.event.currentRound,
          startingBalance: participation.event.startingBalance,
          host: participation.event.hostName ?? participation.event.organizer.name,
          scheduledFor: participation.event.scheduledFor?.toISOString() ?? null,
          startedAt: participation.event.startedAt?.toISOString() ?? null,
          endsAt: participation.event.endsAt?.toISOString() ?? null,
        },
      };
    }),
  );

  const roundsTraded = arenas.reduce((sum, a) => sum + a.roundsTraded, 0);
  const roundsWon = arenas.reduce((sum, a) => sum + a.roundsWon, 0);

  const bestRound = arenas.reduce<{ pnl: number; arenaName: string } | null>((best, arena) => {
    if (!arena.bestRound) return best;
    if (best === null || arena.bestRound.pnl > best.pnl) {
      return { pnl: arena.bestRound.pnl, arenaName: arena.arena.name };
    }
    return best;
  }, null);

  return {
    stats: {
      arenasPlayed: arenas.length,
      roundsTraded,
      roundsWon,
      winRate: roundsTraded > 0 ? roundsWon / roundsTraded : null,
      bestRound,
      podiums: arenas.filter((a) => a.arena.status === 'ENDED' && a.rank <= 3).length,
    },
    arenas,
  };
}
