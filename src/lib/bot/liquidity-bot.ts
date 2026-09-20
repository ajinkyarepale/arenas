import { getPosition, placeTrade } from '@/lib/engine/trading';
import { priceYes as lmsrPriceYes } from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';
import type { Side } from '@/lib/lmsr';

const BOT_COOLDOWN_MS = 1000;
const BOT_EMAIL = 'liquidity-bot@arenas.internal';

// Guard against recursive or overlapping bot executions for the same arena
const evaluatingEvents = new Set<string>();

export async function ensureBotParticipant(eventId: string, startingBalance: number) {
  let botUser = await prisma.user.findFirst({
    where: { isBot: true },
  });

  if (!botUser) {
    botUser = await prisma.user.create({
      data: {
        email: BOT_EMAIL,
        name: 'Liquidity Bot',
        passwordHash: 'BOT_SYSTEM_ACCOUNT',
        isBot: true,
        botPersona: 'LIQUIDITY_BOT',
      },
    });
  }

  let participant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId: botUser.id } },
  });

  if (!participant) {
    participant = await prisma.eventParticipant.create({
      data: {
        eventId,
        userId: botUser.id,
        balance: startingBalance,
      },
    });
  }

  return { botUser, participant };
}

export async function evaluateLiquidityBot(eventId: string, now: number = Date.now()): Promise<void> {
  // Requirement 9: Prevent recursive or concurrent bot evaluation for the same event
  if (evaluatingEvents.has(eventId)) {
    return;
  }
  evaluatingEvents.add(eventId);

  try {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || (!event.botsEnabled && !event.enableBots) || event.botStatus !== 'ACTIVE' || event.status !== 'LIVE') {
      return;
    }

    // Cooldown check (Requirement 13)
    if (event.botLastTradeAt && now - event.botLastTradeAt.getTime() < BOT_COOLDOWN_MS) {
      return;
    }

    if (event.currentRound <= 0) return;

    const round = await prisma.round.findUnique({
      where: { eventId_roundNumber: { eventId, roundNumber: event.currentRound } },
    });

    // Requirement 3 & 4: Obey trading state and stop BEFORE lock window.
    // round.locksAt marks when trading locks (e.g. 30s before resolution).
    // Bot stops trading 2000ms prior to locksAt to guarantee zero lock collisions.
    if (!round || round.status !== 'TRADING') return;
    if (round.locksAt && now >= round.locksAt.getTime() - 2000) return;

    // Ensure Bot user & participant exist
    const { botUser, participant } = await ensureBotParticipant(event.id, event.botStartingBalance);

    // Balance check (Requirement 3 & 13)
    if (participant.balance < 1.0) return;

    // Fetch current implied probability from LMSR state (Requirement 6)
    const currentPriceYes = lmsrPriceYes({ qYes: round.qYes, qNo: round.qNo }, event.liquidityParamB);

    // Fetch Bot's existing inventory/position
    const botPosition = await getPosition(round.id, participant.id);

    // Requirement 7 & 8: Bounded inventory-aware liquidity provider logic
    const netExposure = Math.abs(botPosition.yesCost - botPosition.noCost);
    if (netExposure >= event.botMaxExposure) {
      return;
    }

    let imbalanceThreshold = 0.55;
    let baseStake = 20;

    if (event.botStrategy === 'CONSERVATIVE') {
      imbalanceThreshold = 0.65;
      baseStake = 10;
    } else if (event.botStrategy === 'ADAPTIVE') {
      imbalanceThreshold = 0.52;
      const delta = Math.abs(currentPriceYes - 0.5);
      baseStake = Math.min(50, Math.max(10, Math.floor(delta * 100)));
    }

    let desiredSide: Side | null = null;

    if (currentPriceYes > imbalanceThreshold) {
      // Market heavily favors YES -> Bot buys NO to supply counter-liquidity
      desiredSide = 'NO';
    } else if (currentPriceYes < 1 - imbalanceThreshold) {
      // Market heavily favors NO -> Bot buys YES to supply counter-liquidity
      desiredSide = 'YES';
    }

    if (!desiredSide) return;

    // Inventory dampening: check bot's existing stake on desired side
    const currentSideCost = desiredSide === 'NO' ? botPosition.noCost : botPosition.yesCost;
    const remainingExposureHeadroom = event.botMaxExposure - currentSideCost;

    if (remainingExposureHeadroom <= 0) {
      return;
    }

    // Safe stake sizing respecting max trade size, exposure headroom, and bot balance
    const maxTradeCap = Math.min(baseStake, event.maxStakePerTrade, 50);
    const safeStake = Math.max(
      0,
      Math.min(maxTradeCap, remainingExposureHeadroom, Math.floor(participant.balance)),
    );

    if (safeStake < 1.0) return;

    // Update cooldown timestamp before submitting trade
    await prisma.event.update({
      where: { id: event.id },
      data: { botLastTradeAt: new Date(now) },
    });

    // Requirement 1: Execute trade via standard canonical pipeline used by humans
    const tradeResult = await placeTrade({
      eventId: event.id,
      userId: botUser.id,
      side: desiredSide,
      stake: safeStake,
    });

    if (!tradeResult.ok) {
      // Trade rejected by lock or risk guard — quiet exit
      return;
    }

  } catch (error) {
    console.error(`[liquidity-bot] Error evaluating bot for event ${eventId}, pausing bot:`, error);
    // Requirement 11 & 12: Bot failure must NOT break human trading. Pause bot safely on error.
    await prisma.event
      .update({
        where: { id: eventId },
        data: { botStatus: 'PAUSED' },
      })
      .catch(() => {});
  } finally {
    evaluatingEvents.delete(eventId);
  }
}
