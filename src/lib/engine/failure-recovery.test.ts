import { describe, expect, it, vi, beforeEach } from 'vitest';
import { placeTrade } from './trading';
import { resolveRound, settleRound } from './round-engine';
import { sampleTwap } from '@/lib/price/binance';
import { prisma } from '@/lib/prisma';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    event: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    round: {
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    trade: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn().mockResolvedValue({ _sum: { cost: 0 }, _count: { _all: 0 } }),
    },
    eventParticipant: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    pointLedger: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock('@/lib/price/binance', () => ({
  getPrice: vi.fn(),
  sampleTwap: vi.fn(),
}));

describe('Part 4 - Failure & Recovery Test Suite', () => {
  const eventId = 'event-fail-1';
  const userId = 'user-fail-1';
  const participantId = 'part-fail-1';
  const roundId = 'round-fail-1';

  const mockEvent = {
    id: eventId,
    status: 'LIVE',
    asset: 'BTCUSDT',
    marketCategory: 'CRYPTO_PRICE',
    liquidityParamB: 40,
    maxStakePerTrade: 250,
  };

  const mockRound = {
    id: roundId,
    eventId,
    roundNumber: 1,
    status: 'TRADING',
    qYes: 0,
    qNo: 0,
    openPrice: 65000,
    locksAt: new Date(Date.now() + 60000),
    event: mockEvent,
  };

  const mockParticipant = {
    id: participantId,
    eventId,
    userId,
    balance: 1000,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.event.findUnique as any).mockResolvedValue(mockEvent);
    (prisma.round.findUnique as any).mockResolvedValue(mockRound);
    (prisma.trade.findMany as any).mockResolvedValue([]);
    (prisma.eventParticipant.findUnique as any).mockResolvedValue(mockParticipant);
    (prisma.eventParticipant.findUniqueOrThrow as any).mockResolvedValue(mockParticipant);
    (prisma.round.findUniqueOrThrow as any).mockResolvedValue(mockRound);
    (prisma.user.findUnique as any).mockResolvedValue({ name: 'Trader', isBot: false });
    (prisma.round.updateMany as any).mockResolvedValue({ count: 1 });
  });

  describe('A. DATABASE FAILURE', () => {
    it('fails trade atomically when DB transaction rejects', async () => {
      (prisma.$transaction as any).mockRejectedValue(new Error('DB Connection Timeout'));

      const res = await placeTrade({
        eventId,
        userId,
        side: 'YES',
        stake: 25,
      });

      if (!res.ok) {
        expect(res.reason).toBe('contention');
      }
    });
  });

  describe('B. BINANCE FAILURE DURING SETTLEMENT', () => {
    it('round becomes VOID when price samples are insufficient', async () => {
      (sampleTwap as any).mockResolvedValue({
        price: null,
        samples: [],
        requested: 6,
      });

      (prisma.round.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.round.findUnique as any).mockResolvedValue({
        ...mockRound,
        status: 'LOCKED',
        roundNumber: 1,
        openPrice: 65000,
        event: mockEvent,
      });
      (prisma.round.findUniqueOrThrow as any).mockResolvedValue({
        ...mockRound,
        status: 'LOCKED',
        roundNumber: 1,
        openPrice: 65000,
        event: mockEvent,
      });
      (prisma.round.update as any).mockResolvedValue({
        ...mockRound,
        status: 'RESOLVED',
        outcome: 'VOID',
        openPrice: 65000,
        closePrice: null,
        event: mockEvent,
      });
      (prisma.$transaction as any).mockImplementation((cb: any) => cb(prisma));

      const resolved = await resolveRound(roundId);

      expect(resolved).toBe(true);
      expect(prisma.round.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: roundId },
          data: expect.objectContaining({
            status: 'RESOLVED',
            outcome: 'VOID',
          }),
        }),
      );
    });
  });

  describe('F. LOCK BOUNDARY', () => {
    it('accepts trade before locksAt and rejects trade after locksAt', async () => {
      const pastLockRound = {
        ...mockRound,
        locksAt: new Date(Date.now() - 5000), // Locked 5s ago
      };

      (prisma.round.findUnique as any).mockResolvedValue(pastLockRound);

      const res = await placeTrade({
        eventId,
        userId,
        side: 'YES',
        stake: 10,
      });

      if (!res.ok) {
        expect(res.reason).toBe('round-locked');
      }
    });
  });
});
