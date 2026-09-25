import { priceYes as lmsrPriceYes } from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';
import { aggregateRound, buildRoundPayload, computeLeaderboard } from '@/lib/engine/round-engine';
import { getPosition, type PositionSummary } from '@/lib/engine/trading';
import type {
  ArenaStatePayload,
  LeaderboardPayload,
  RoundPayload,
} from '@/lib/realtime/events';

/**
 * A single authoritative snapshot of an arena.
 *
 * Everything the live screen, the big screen, and the join screen render can be
 * rebuilt from this one object. That is what makes the realtime layer safe to
 * lose: a phone that slept through three rounds, an iOS tab that was frozen in
 * the background, or a projector whose wifi dropped all recover by fetching
 * this rather than by replaying missed socket messages.
 */

export interface ArenaPublicInfo {
  id: string;
  code: string;
  name: string;
  description: string | null;
  hostName: string | null;
  organizerName: string;
  asset: string;
  roundDurationSec: number;
  lockBufferSec: number;
  totalRounds: number;
  startingBalance: number;
  liquidityParamB: number;
  maxStakePerTrade: number;
  status: ArenaStatePayload['status'];
  currentRound: number;
  scheduledFor: string | null;
  startedAt: string | null;
  endsAt: string | null;
  participantCount: number;
}

export interface ArenaViewerInfo {
  joined: boolean;
  participantId: string | null;
  balance: number | null;
  position: PositionSummary | null;
  rank: number | null;
}

export interface ArenaSnapshot {
  arena: ArenaPublicInfo;
  round: RoundPayload | null;
  leaderboard: LeaderboardPayload;
  viewer: ArenaViewerInfo;
  serverTime: string;
}

export async function findArenaByCode(code: string) {
  return prisma.event.findUnique({
    where: { code: code.toUpperCase() },
    include: {
      organizer: { select: { name: true } },
      _count: { select: { participants: true } },
    },
  });
}

type ArenaWithMeta = NonNullable<Awaited<ReturnType<typeof findArenaByCode>>>;

export function toPublicInfo(event: ArenaWithMeta): ArenaPublicInfo {
  return {
    id: event.id,
    code: event.code,
    name: event.name,
    description: event.description,
    hostName: event.hostName,
    organizerName: event.organizer.name,
    asset: event.asset,
    roundDurationSec: event.roundDurationSec,
    lockBufferSec: event.lockBufferSec,
    totalRounds: event.totalRounds,
    startingBalance: event.startingBalance,
    liquidityParamB: event.liquidityParamB,
    maxStakePerTrade: event.maxStakePerTrade,
    status: event.status,
    currentRound: event.currentRound,
    scheduledFor: event.scheduledFor?.toISOString() ?? null,
    startedAt: event.startedAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    participantCount: event._count.participants,
  };
}

export async function buildSnapshot(
  event: ArenaWithMeta,
  userId?: string | null,
  options: { leaderboardLimit?: number } = {},
): Promise<ArenaSnapshot> {
  const round =
    event.currentRound > 0
      ? await prisma.round.findUnique({
          where: {
            eventId_roundNumber: {
              eventId: event.id,
              roundNumber: event.currentRound,
            },
          },
        })
      : null;

  const [aggregate, leaderboard] = await Promise.all([
    round ? aggregateRound(round.id) : Promise.resolve({ volume: 0, tradeCount: 0 }),
    computeLeaderboard(event.id, { limit: options.leaderboardLimit }),
  ]);

  let viewer: ArenaViewerInfo = {
    joined: false,
    participantId: null,
    balance: null,
    position: null,
    rank: null,
  };

  if (userId) {
    const participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: event.id, userId } },
      select: { id: true, balance: true },
    });

    if (participant) {
      // The viewer's rank is computed over every participant, not just the
      // slice the leaderboard payload carries, so someone in 40th place still
      // sees 40 and not "unranked".
      const ahead = await prisma.eventParticipant.count({
        where: { eventId: event.id, balance: { gt: participant.balance } },
      });

      viewer = {
        joined: true,
        participantId: participant.id,
        balance: participant.balance,
        position: round ? await getPosition(round.id, participant.id) : null,
        rank: ahead + 1,
      };
    }
  }

  return {
    arena: toPublicInfo(event),
    round: round ? buildRoundPayload(event, round, aggregate) : null,
    leaderboard,
    viewer,
    serverTime: new Date().toISOString(),
  };
}

/** Current implied probability without loading a full snapshot. */
export function impliedProbability(
  round: { qYes: number; qNo: number } | null,
  b: number,
): number {
  if (!round) return 0.5;
  return lmsrPriceYes({ qYes: round.qYes, qNo: round.qNo }, b);
}
