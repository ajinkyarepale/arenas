import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { priceYes } from '@/lib/lmsr';

export const dynamic = 'force-dynamic';

export interface EventOverviewItem {
  id: string;
  code: string;
  name: string;
  asset: string;
  marketCategory: string;
  status: string;
  mode: string;
  collegeName: string | null;
  organizerName: string | null;
  totalRounds: number;
  currentRound: number;
  participantCount: number;
  tradeCount: number;
  totalVolume: number;
  resolvedRoundsCount: number;
  accuracyRate: number | null; // e.g. 0.75 for 75%
  roundOutcomes: Array<{
    roundNumber: number;
    outcome: string | null;
    predictedOutcome: 'YES' | 'NO' | 'EVEN';
    isCorrect: boolean | null;
    volume: number;
  }>;
  createdAt: string;
  startedAt: string | null;
  endsAt: string | null;
}

export interface AnalyticsOverviewPayload {
  summary: {
    totalEvents: number;
    liveEvents: number;
    endedEvents: number;
    totalParticipants: number;
    totalPredictions: number;
    totalVolume: number;
    overallAccuracyRate: number | null;
    totalResolvedRounds: number;
  };
  events: EventOverviewItem[];
}

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { name: true, email: true } },
        rounds: {
          orderBy: { roundNumber: 'asc' },
          select: {
            id: true,
            roundNumber: true,
            status: true,
            outcome: true,
            qYes: true,
            qNo: true,
            trades: {
              select: {
                cost: true,
                side: true,
                payout: true,
              },
            },
          },
        },
        _count: {
          select: {
            participants: true,
            trades: true,
          },
        },
      },
    });

    let globalVolume = 0;
    let globalPredictions = 0;
    let globalResolvedRounds = 0;
    let globalCorrectPredictions = 0;

    const eventItems: EventOverviewItem[] = events.map((ev) => {
      let eventVolume = 0;
      let eventResolvedCount = 0;
      let eventCorrectCount = 0;

      const roundOutcomes = ev.rounds.map((r) => {
        const roundVol = r.trades.reduce((sum, t) => sum + t.cost, 0);
        eventVolume += roundVol;

        const pYes = priceYes({ qYes: r.qYes, qNo: r.qNo }, ev.liquidityParamB);
        const predicted: 'YES' | 'NO' | 'EVEN' =
          pYes > 0.52 ? 'YES' : pYes < 0.48 ? 'NO' : 'EVEN';

        let isCorrect: boolean | null = null;
        if (r.status === 'RESOLVED' && r.outcome && r.outcome !== 'VOID') {
          isCorrect = r.outcome === predicted;
          eventResolvedCount++;
          globalResolvedRounds++;
          if (isCorrect) {
            eventCorrectCount++;
            globalCorrectPredictions++;
          }
        }

        return {
          roundNumber: r.roundNumber,
          outcome: r.outcome,
          predictedOutcome: predicted,
          isCorrect,
          volume: roundVol,
        };
      });

      globalVolume += eventVolume;
      globalPredictions += ev._count.trades;

      const accuracy =
        eventResolvedCount > 0 ? eventCorrectCount / eventResolvedCount : null;

      return {
        id: ev.id,
        code: ev.code,
        name: ev.name,
        asset: ev.asset,
        marketCategory: ev.marketCategory,
        status: ev.status,
        mode: ev.mode,
        collegeName: ev.collegeName,
        organizerName: ev.organizer?.name ?? 'Organizer',
        totalRounds: ev.totalRounds,
        currentRound: ev.currentRound,
        participantCount: ev._count.participants,
        tradeCount: ev._count.trades,
        totalVolume: eventVolume,
        resolvedRoundsCount: eventResolvedCount,
        accuracyRate: accuracy,
        roundOutcomes,
        createdAt: ev.createdAt.toISOString(),
        startedAt: ev.startedAt?.toISOString() ?? null,
        endsAt: ev.endsAt?.toISOString() ?? null,
      };
    });

    const totalUniqueParticipants = events.reduce((acc, ev) => acc + ev._count.participants, 0);
    const overallAccuracy =
      globalResolvedRounds > 0 ? globalCorrectPredictions / globalResolvedRounds : null;

    const payload: AnalyticsOverviewPayload = {
      summary: {
        totalEvents: events.length,
        liveEvents: events.filter((e) => e.status === 'LIVE').length,
        endedEvents: events.filter((e) => e.status === 'ENDED').length,
        totalParticipants: totalUniqueParticipants,
        totalPredictions: globalPredictions,
        totalVolume: globalVolume,
        overallAccuracyRate: overallAccuracy,
        totalResolvedRounds: globalResolvedRounds,
      },
      events: eventItems,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[/api/analytics/overview GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to load analytics overview' }, { status: 500 });
  }
}
