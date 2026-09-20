import { describe, expect, it, vi, beforeEach } from 'vitest';
import { evaluateDemoRoom, ensureDemoParticipants, resetDemoRoom } from './demo-controller';
import { placeTrade } from './trading';
import { prisma } from '@/lib/prisma';

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
      updateMany: vi.fn(),
    },
    trade: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/engine/trading', () => ({
  placeTrade: vi.fn(),
  getPosition: vi.fn(),
}));

describe('Demo Controller (60 Virtual Participants) Hardening Tests', () => {
  const eventId = 'demo-event-123';
  const now = 1000000;

  const mockDemoEvent = {
    id: eventId,
    mode: 'DEMO',
    demoStatus: 'ACTIVE',
    status: 'LIVE',
    startingBalance: 1000,
    currentRound: 1,
    liquidityParamB: 40,
    maxStakePerTrade: 100,
  };

  const mockRound = {
    id: 'round-demo-1',
    eventId,
    roundNumber: 1,
    status: 'TRADING',
    qYes: 0,
    qNo: 0,
    locksAt: new Date(now + 60000), // 60s in future
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (prisma.event.findUnique as any).mockResolvedValue(mockDemoEvent);
    (prisma.round.findUnique as any).mockResolvedValue(mockRound);
    (prisma.user.findFirst as any).mockImplementation(({ where }: any) => {
      return Promise.resolve({
        id: `user-${where.email}`,
        email: where.email,
        name: 'DEMO_USER',
        isBot: true,
        botPersona: 'DEMO_BOT',
      });
    });
    (prisma.eventParticipant.findUnique as any).mockImplementation(({ where }: any) => {
      return Promise.resolve({
        id: `participant-${where.eventId_userId.userId}`,
        eventId: where.eventId_userId.eventId,
        userId: where.eventId_userId.userId,
        balance: 1000,
      });
    });
    (placeTrade as any).mockResolvedValue({ ok: true });
  });

  it('provisions 60 virtual participants cleanly', async () => {
    const participants = await ensureDemoParticipants(eventId, 60, 1000);
    expect(participants.length).toBe(60);
  });

  it('executes trades using the exact canonical placeTrade() pipeline', async () => {
    await evaluateDemoRoom(eventId, {}, now);

    expect(placeTrade).toHaveBeenCalled();
    const calls = (placeTrade as any).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    // Assert every call targets the demo event and specifies valid side and stake
    for (const [arg] of calls) {
      expect(arg.eventId).toBe(eventId);
      expect(['YES', 'NO']).toContain(arg.side);
      expect(arg.stake).toBeGreaterThan(0);
    }
  });

  it('halts demo trading when round is locked or near locksAt (< 2000ms)', async () => {
    (prisma.round.findUnique as any).mockResolvedValue({
      ...mockRound,
      locksAt: new Date(now + 1000), // 1s before locksAt
    });

    await evaluateDemoRoom(eventId, {}, now);

    expect(placeTrade).not.toHaveBeenCalled();
  });

  it('prevents recursive infinite loop evaluations', async () => {
    // Concurrent evaluations for same event ID
    const eval1 = evaluateDemoRoom(eventId, {}, now);
    const eval2 = evaluateDemoRoom(eventId, {}, now);

    await Promise.all([eval1, eval2]);

    // In-memory set prevents duplicate evaluation run
    expect((placeTrade as any).mock.calls.length).toBeLessThanOrEqual(15);
  });

  it('resets demo room safely without touching live events', async () => {
    await resetDemoRoom(eventId);

    expect(prisma.event.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: eventId },
        data: { demoStatus: 'STOPPED' },
      }),
    );
    expect(prisma.trade.deleteMany).toHaveBeenCalledWith({ where: { eventId } });
    expect(prisma.eventParticipant.updateMany).toHaveBeenCalledWith({
      where: { eventId },
      data: { balance: 1000 },
    });
  });
});
