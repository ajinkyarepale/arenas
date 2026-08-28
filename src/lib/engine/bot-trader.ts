import { prisma } from '@/lib/prisma';
import { placeTrade } from '@/lib/engine/round-engine';

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
 * Ensures a system bot user exists in the database for noise trading.
 */
async function getOrCreateBotUser(name: string): Promise<string> {
  const email = `bot_${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@arenas.internal`;
  const user = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: {
      name: `${name} [AI]`,
      email,
      passwordHash: 'BOT_SYSTEM_ACCOUNT',
      role: 'PARTICIPANT',
    },
    select: { id: true },
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

    // Pick a random bot persona
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const botUserId = await getOrCreateBotUser(botName);

    // Randomize micro-stake (10 to 40 pts, capped at maxStakePerTrade / 5)
    const maxBotStake = Math.min(40, event.maxStakePerTrade);
    const stake = Math.floor(Math.random() * (maxBotStake - 10 + 1)) + 10;

    // Randomize side (slight momentum bias based on current inventory)
    const diff = round.qYes - round.qNo;
    let side: 'YES' | 'NO' = Math.random() > 0.5 ? 'YES' : 'NO';
    // 30% chance to follow trend, 70% random
    if (Math.random() < 0.3) {
      side = diff >= 0 ? 'YES' : 'NO';
    }

    // Place trade using the core engine (which handles LMSR math, ledger, & SSE push)
    await placeTrade(
      {
        eventId: event.id,
        userId: botUserId,
        side,
        stake,
      },
      `bot-${Date.now()}`
    );

    return true;
  } catch (error) {
    console.error(`[executeBotMicroTrade] Failed bot trade for event ${eventId}:`, error);
    return false;
  }
}
