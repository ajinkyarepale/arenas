import { prisma } from '@/lib/prisma';
import { placeTrade } from '@/lib/engine/trading';

const BOT_NAMES = [
  'AlphaBot',
  'CampusWhale',
  'QuantMaker',
  'DeltaHedger',
  'TrendSeeker',
  'NoiseMaker',
  'MarketPulse',
  'ByteTrader',
];

/**
 * Ensures a system bot user exists in the database and is registered as a participant in the event.
 */
async function getOrCreateBotParticipant(eventId: string, startingBalance: number): Promise<string> {
  const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const email = `bot_${botName.toLowerCase().replace(/[^a-z0-9]/g, '')}@arenas.internal`;

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: `${botName} [AI]`,
      email,
      passwordHash: 'BOT_SYSTEM_ACCOUNT',
      role: 'PARTICIPANT',
    },
    select: { id: true },
  });

  await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    update: {},
    create: {
      eventId,
      userId: user.id,
      balance: startingBalance,
    },
  });

  return user.id;
}

/**
 * Executes an automated micro-trade from an AI noise trader on an active round.
 */
export async function executeBotMicroTrade(eventId: string, roundId: string): Promise<boolean> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        rounds: {
          where: { id: roundId, status: 'TRADING' },
          take: 1,
        },
      },
    });

    if (!event || !event.enableBots || event.rounds.length === 0) {
      return false;
    }

    const round = event.rounds[0];
    if (round.status !== 'TRADING') return false;

    const botUserId = await getOrCreateBotParticipant(event.id, event.startingBalance);

    // Randomize micro-stake (10 to 40 pts, capped at maxStakePerTrade / 5)
    const maxBotStake = Math.min(40, event.maxStakePerTrade);
    const stake = Math.floor(Math.random() * (maxBotStake - 10 + 1)) + 10;

    // Randomize side (slight trend bias based on current inventory)
    const diff = round.qYes - round.qNo;
    let side: 'YES' | 'NO' = Math.random() > 0.5 ? 'YES' : 'NO';
    if (Math.random() < 0.3) {
      side = diff >= 0 ? 'YES' : 'NO';
    }

    // Place trade using the core trading engine
    const result = await placeTrade({
      eventId: event.id,
      userId: botUserId,
      side,
      stake,
    });

    return result.ok;
  } catch (error) {
    console.error(`[executeBotMicroTrade] Failed bot trade for event ${eventId}:`, error);
    return false;
  }
}
