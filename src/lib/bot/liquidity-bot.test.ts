import { describe, expect, it, vi, beforeEach } from 'vitest';
import { evaluateLiquidityBot } from './liquidity-bot';
import { prisma } from '@/lib/prisma';
import { placeTrade, getPosition } from '@/lib/engine/trading';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    round: {
      findUnique: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    eventParticipant: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/engine/trading', () => ({
  placeTrade: vi.fn(),
  getPosition: vi.fn(),
}));

describe('Liquidity Bot Hardening Tests', () => {
  const eventId = 'test-event-123';
  const botUserId = 'bot-user-id';
  const botParticipantId = 'bot-participant-id';
  const now = 1000000;

  const mockEvent = {
    id: eventId,
    status: 'LIVE',
    botsEnabled: true,
    enableBots: true,
    botStatus: 'ACTIVE',
    botStartingBalance: 1000,
    botMaxExposure: 500,
    botStrategy: 'BALANCED',
    botLastTradeAt: null,
    currentRound: 1,
    liquidityParamB: 40,
    maxStakePerTrade: 50,
  };

  const mockRound = {
    id: 'round-1',
    eventId,
    roundNumber: 1,
    status: 'TRADING',
    qYes: 0,
    qNo: 0,
    locksAt: new Date(now + 60000), // 60s in future
  };

  const mockBotUser = {
    id: botUserId,
    isBot: true,
    botPersona: 'LIQUIDITY_BOT',
    name: 'Liquidity Bot',
  };

  const mockParticipant = {
    id: botParticipantId,
    eventId,
    userId: botUserId,
    balance: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
    (prisma.round.findUnique as any).mockResolvedValue(mockRound);
    (prisma.user.findFirst as any).mockResolvedValue(mockBotUser);
    (prisma.eventParticipant.findUnique as any).mockResolvedValue(mockParticipant);
    (prisma.event.update as any).mockResolvedValue(mockEvent);
    (getPosition as any).mockResolvedValue({ yesCost: 0, noCost: 0, netShares: 0 });
    (placeTrade as any).mockResolvedValue({ ok: true });
  });

  it('submits NO trade when YES is heavily favoured (High YES imbalance)', async () => {
    // qYes high -> priceYes > 0.55
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 20,
      qNo: 0,
    });

    await evaluateLiquidityBot(eventId, now);

    expect(placeTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        userId: botUserId,
        side: 'NO',
      }),
    );
  });

  it('submits YES trade when NO is heavily favoured (High NO imbalance)', async () => {
    // qNo high -> priceYes < 0.45
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 0,
      qNo: 20,
    });

    await evaluateLiquidityBot(eventId, now);

    expect(placeTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        userId: botUserId,
        side: 'YES',
      }),
    );
  });

  it('declines to trade when participant balance is low (< 1.0)', async () => {
    (prisma.eventParticipant.findUnique as any).mockResolvedValue({
      ...mockParticipant,
      balance: 0.5,
    });
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 20,
      qNo: 0,
    });

    await evaluateLiquidityBot(eventId, now);

    expect(placeTrade).not.toHaveBeenCalled();
  });

  it('declines to trade when maximum exposure limit is reached', async () => {
    (getPosition as any).mockResolvedValue({
      yesCost: 0,
      noCost: 500, // Max exposure reached
      netShares: -50,
    });
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 20,
      qNo: 0,
    });

    await evaluateLiquidityBot(eventId, now);

    expect(placeTrade).not.toHaveBeenCalled();
  });

  it('stops trading when near lock time (< 2000ms from locksAt)', async () => {
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 20,
      qNo: 0,
      locksAt: new Date(now + 1000), // Only 1s before locksAt
    });

    await evaluateLiquidityBot(eventId, now);

    expect(placeTrade).not.toHaveBeenCalled();
  });

  it('pauses bot and safely catches error without throwing on bot failure', async () => {
    (prisma.event.findUnique as any).mockRejectedValue(new Error('Unexpected DB error'));

    await expect(evaluateLiquidityBot(eventId, now)).resolves.not.toThrow();

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: eventId },
        data: { botStatus: 'PAUSED' },
      }),
    );
  });

  it('prevents recursive or concurrent duplicate market update evaluations', async () => {
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      qYes: 20,
      qNo: 0,
    });

    // Fire two evaluations concurrently
    const eval1 = evaluateLiquidityBot(eventId, now);
    const eval2 = evaluateLiquidityBot(eventId, now);

    await Promise.all([eval1, eval2]);

    // Second evaluation exits early due to evaluatingEvents guard
    expect(placeTrade).toHaveBeenCalledTimes(1);
  });
});
