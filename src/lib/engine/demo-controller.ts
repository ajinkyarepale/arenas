import { placeTrade, getPosition } from '@/lib/engine/trading';
import { priceYes as lmsrPriceYes } from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';
import type { Side } from '@/lib/lmsr';

export interface DemoConfig {
  participantCount: number;
  startingBalance: number;
  burstProbability: number;
  largeTradeProbability: number;
}

export interface DemoMetrics {
  totalAttempts: number;
  successfulTrades: number;
  rejectedTrades: number;
  totalVolume: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  activeParticipants: number;
}

const DEFAULT_CONFIG: DemoConfig = {
  participantCount: 60,
  startingBalance: 1000,
  burstProbability: 0.3,
  largeTradeProbability: 0.15,
};

const demoEvaluatingEvents = new Set<string>();
const demoMetricsMap = new Map<string, { attempts: number; success: number; rejected: number; volume: number; latencies: number[] }>();

export type DemoStrategy = 'YES_MOMENTUM' | 'NO_MOMENTUM' | 'CONTRARIAN' | 'RANDOM' | 'SMALL_TRADER' | 'LARGE_TRADER' | 'BALANCED';

const STRATEGIES: DemoStrategy[] = [
  'YES_MOMENTUM',
  'NO_MOMENTUM',
  'CONTRARIAN',
  'RANDOM',
  'SMALL_TRADER',
  'LARGE_TRADER',
  'BALANCED',
];

/**
 * Ensure exactly 60 virtual demo participants exist for a demo arena.
 * Virtual demo users have `isBot: true` and `botPersona: 'DEMO_BOT'`.
 */
export async function ensureDemoParticipants(eventId: string, count = 60, startingBalance = 1000) {
  const participants = [];

  for (let i = 1; i <= count; i++) {
    const numStr = String(i).padStart(3, '0');
    const email = `demo_${numStr}@arenas.internal`;
    const name = `DEMO_${numStr}`;

    let user = await prisma.user.findFirst({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: 'DEMO_SYSTEM_ACCOUNT',
          isBot: true,
          botPersona: 'DEMO_BOT',
        },
      });
    }

    let participant = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId, userId: user.id } },
    });

    if (!participant) {
      participant = await prisma.eventParticipant.create({
        data: {
          eventId,
          userId: user.id,
          balance: startingBalance,
        },
      });
    }

    participants.push({ user, participant, strategy: STRATEGIES[i % STRATEGIES.length] });
  }

  return participants;
}

/**
 * Determine trade side based on strategy, current AMM probability, and position
 */
function chooseSideAndStake(
  strategy: DemoStrategy,
  priceYes: number,
  balance: number,
  maxStake: number,
  largeTradeProb: number,
): { side: Side; stake: number } {
  let side: Side = 'YES';

  switch (strategy) {
    case 'YES_MOMENTUM':
      side = priceYes >= 0.48 ? 'YES' : 'NO';
      break;
    case 'NO_MOMENTUM':
      side = priceYes <= 0.52 ? 'NO' : 'YES';
      break;
    case 'CONTRARIAN':
      side = priceYes > 0.55 ? 'NO' : priceYes < 0.45 ? 'YES' : Math.random() > 0.5 ? 'YES' : 'NO';
      break;
    case 'BALANCED':
      side = priceYes > 0.50 ? 'NO' : 'YES';
      break;
    case 'RANDOM':
    case 'SMALL_TRADER':
    case 'LARGE_TRADER':
    default:
      side = Math.random() > 0.5 ? 'YES' : 'NO';
      break;
  }

  // Determine stake size category
  let minStake = 5;
  let maxStakeSize = 25;

  if (strategy === 'LARGE_TRADER' || Math.random() < largeTradeProb) {
    minStake = 75;
    maxStakeSize = 200;
  } else if (strategy === 'SMALL_TRADER') {
    minStake = 5;
    maxStakeSize = 20;
  } else {
    // Medium trader
    minStake = 20;
    maxStakeSize = 75;
  }

  const rawStake = Math.floor(minStake + Math.random() * (maxStakeSize - minStake));
  const stake = Math.max(1, Math.min(rawStake, maxStake, Math.floor(balance)));

  return { side, stake };
}

/**
 * Server-Side Demo Controller Tick.
 * Concurrently evaluates a burst of virtual traders against canonical placeTrade().
 */
export async function evaluateDemoRoom(
  eventId: string,
  config: Partial<DemoConfig> = {},
  now: number = Date.now(),
): Promise<void> {
  if (demoEvaluatingEvents.has(eventId)) {
    return;
  }
  demoEvaluatingEvents.add(eventId);

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.mode !== 'DEMO' || event.demoStatus !== 'ACTIVE' || event.status !== 'LIVE') {
      return;
    }

    if (event.currentRound <= 0) return;

    const round = await prisma.round.findUnique({
      where: { eventId_roundNumber: { eventId: event.id, roundNumber: event.currentRound } },
    });

    // Requirement 13: Halt trading during LOCKED, RESOLVING, RESOLVED, or near locksAt
    if (!round || round.status !== 'TRADING') return;
    if (round.locksAt && now >= round.locksAt.getTime() - 2000) return;

    const fullConfig = { ...DEFAULT_CONFIG, ...config };
    const demoParticipants = await ensureDemoParticipants(event.id, fullConfig.participantCount, fullConfig.startingBalance);

    const priceYes = lmsrPriceYes({ qYes: round.qYes, qNo: round.qNo }, event.liquidityParamB);

    // Determine burst size: simulate 3 to 12 concurrent trades in this tick
    const isBurst = Math.random() < fullConfig.burstProbability;
    const activeCount = isBurst ? Math.floor(6 + Math.random() * 8) : Math.floor(2 + Math.random() * 3);

    // Shuffle and pick active participants
    const shuffled = [...demoParticipants].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, activeCount);

    let metrics = demoMetricsMap.get(eventId);
    if (!metrics) {
      metrics = { attempts: 0, success: 0, rejected: 0, volume: 0, latencies: [] };
      demoMetricsMap.set(eventId, metrics);
    }

    const tradePromises = selected.map(async (item) => {
      if (item.participant.balance < 1.0) return;

      const { side, stake } = chooseSideAndStake(
        item.strategy,
        priceYes,
        item.participant.balance,
        event.maxStakePerTrade,
        fullConfig.largeTradeProbability,
      );

      metrics!.attempts++;
      const t0 = performance.now();

      const result = await placeTrade({
        eventId: event.id,
        userId: item.user.id,
        side,
        stake,
      });

      const latency = performance.now() - t0;
      metrics!.latencies.push(latency);

      if (result.ok) {
        metrics!.success++;
        metrics!.volume += stake;
      } else {
        metrics!.rejected++;
      }
    });

    await Promise.all(tradePromises);
  } catch (error) {
    console.error(`[demo-controller] Error executing demo tick for event ${eventId}:`, error);
  } finally {
    demoEvaluatingEvents.delete(eventId);
  }
}

/**
 * Reset Demo room state cleanly and idempotently
 */
export async function resetDemoRoom(eventId: string): Promise<void> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || event.mode !== 'DEMO') return;

  // Stop demo scheduler for this event
  await prisma.event.update({
    where: { id: eventId },
    data: { demoStatus: 'STOPPED' },
  });

  // Clear demo trades for this event
  await prisma.trade.deleteMany({
    where: { eventId },
  });

  // Reset demo participant balances
  await prisma.eventParticipant.updateMany({
    where: { eventId },
    data: { balance: event.startingBalance },
  });

  // Clear metrics
  demoMetricsMap.delete(eventId);
}

export function getDemoMetrics(eventId: string): DemoMetrics {
  const m = demoMetricsMap.get(eventId) ?? { attempts: 0, success: 0, rejected: 0, volume: 0, latencies: [] };
  const sorted = [...m.latencies].sort((a, b) => a - b);
  const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  const p95Idx = Math.floor(sorted.length * 0.95);
  const p99Idx = Math.floor(sorted.length * 0.99);

  return {
    totalAttempts: m.attempts,
    successfulTrades: m.success,
    rejectedTrades: m.rejected,
    totalVolume: m.volume,
    avgLatencyMs: Number(avg.toFixed(2)),
    p95LatencyMs: Number((sorted[p95Idx] ?? 0).toFixed(2)),
    p99LatencyMs: Number((sorted[p99Idx] ?? 0).toFixed(2)),
    activeParticipants: 60,
  };
}
