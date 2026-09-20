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

const cachedBotParticipants = new Map<string, string[]>();

/**
 * Ensures system bot users exist in the database and are registered as participants in the event.
 */
async function getBotParticipants(eventId: string, startingBalance: number): Promise<string[]> {
  const cached = cachedBotParticipants.get(eventId);
  if (cached && cached.length >= BOT_NAMES.length) {
    return cached;
  }

  const ids: string[] = [];
  for (const botName of BOT_NAMES) {
    const email = `bot_${botName.toLowerCase().replace(/[^a-z0-9]/g, '')}@arenas.internal`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name: `${botName} [AI]`,
        email,
        passwordHash: 'BOT_SYSTEM_ACCOUNT',
        role: 'PARTICIPANT',
        isBot: true,
        botPersona: 'NOISE_BOT',
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

    ids.push(user.id);
  }

  cachedBotParticipants.set(eventId, ids);
  return ids;
}

/**
 * Executes an automated micro-trade from AI noise traders on an active round.
 */
export async function executeBotMicroTrade(
  eventId: string,
  roundId: string,
  count: number = 2,
  loadedEvent?: any,
  loadedRound?: any,
): Promise<boolean> {
  try {
    let event = loadedEvent;
    let round = loadedRound;

    if (!event || !round) {
      const fetched = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          rounds: {
            where: { id: roundId, status: 'TRADING' },
            take: 1,
          },
        },
      });
      if (!fetched || fetched.rounds.length === 0) return false;
      event = fetched;
      round = fetched.rounds[0];
    }

    if (!event || (!event.enableBots && !event.botsEnabled) || !round || round.status !== 'TRADING') {
      return false;
    }

    const botUserIds = await getBotParticipants(event.id, event.startingBalance);
    if (botUserIds.length === 0) return false;

    let anySuccess = false;
    const tradesToExecute = Math.min(count, 4);

    for (let i = 0; i < tradesToExecute; i++) {
      const botUserId = botUserIds[Math.floor(Math.random() * botUserIds.length)];
      const maxBotStake = Math.min(40, event.maxStakePerTrade);
      const stake = Math.floor(Math.random() * (maxBotStake - 10 + 1)) + 10;

      const diff = round.qYes - round.qNo;
      let side: 'YES' | 'NO' = Math.random() > 0.5 ? 'YES' : 'NO';
      if (Math.random() < 0.3) {
        side = diff >= 0 ? 'YES' : 'NO';
      }

      const result = await placeTrade({
        eventId: event.id,
        userId: botUserId,
        side,
        stake,
      });

      if (result.ok) anySuccess = true;
    }

    return anySuccess;
  } catch (error) {
    console.error(`[executeBotMicroTrade] Failed bot trade for event ${eventId}:`, error);
    return false;
  }
}
