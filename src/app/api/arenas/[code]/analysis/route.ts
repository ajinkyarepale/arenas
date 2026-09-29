import { NextResponse } from 'next/server';

import { notFound } from '@/lib/api';
import { priceYes } from '@/lib/lmsr';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export interface RoundAnalysisItem {
  id: string;
  roundNumber: number;
  status: string;
  question: string;
  asset: string;
  openPrice: number | null;
  closePrice: number | null;
  priceDelta: number | null;
  priceDeltaPercent: number | null;
  outcome: string | null;
  voidReason: string | null;
  openingProbability: number;
  finalProbability: number;
  probabilityShift: number;
  totalVolume: number;
  tradesCount: number;
  yesVolume: number;
  noVolume: number;
  yesShares: number;
  noShares: number;
  totalPayout: number;
  uniqueParticipants: number;
  opensAt: string | null;
  locksAt: string | null;
  resolvedAt: string | null;
  calibration: {
    predictedOutcome: 'YES' | 'NO' | 'EVEN';
    actualOutcome: string | null;
    isCorrect: boolean | null;
    brierScore: number | null;
    confidence: number;
    verdict: string;
  };
  probabilityTimeline: Array<{
    time: string;
    priceYes: number;
    side?: string;
    shares?: number;
    cost?: number;
  }>;
  topPerformers: Array<{
    userId: string;
    name: string;
    isBot: boolean;
    cost: number;
    payout: number;
    pnl: number;
    sharesYes: number;
    sharesNo: number;
  }>;
}

export interface TournamentAnalysisPayload {
  arena: {
    id: string;
    code: string;
    name: string;
    asset: string;
    status: string;
    currentRound: number;
    totalRounds: number;
    startingBalance: number;
    liquidityParamB: number;
    collegeName: string | null;
    organizerName: string | null;
  };
  summary: {
    totalVolume: number;
    totalTrades: number;
    resolvedRounds: number;
    totalRounds: number;
    accuracyRate: number | null; // e.g. 0.8 for 80%
    correctPredictions: number;
    averageBrierScore: number | null;
    totalPayouts: number;
  };
  rounds: RoundAnalysisItem[];
}

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('Invalid arena code');

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
    include: {
      organizer: { select: { name: true } },
    },
  });

  if (!event) return notFound('Arena not found');

  const rounds = await prisma.round.findMany({
    where: { eventId: event.id },
    orderBy: { roundNumber: 'asc' },
    include: {
      trades: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, isBot: true } },
        },
      },
    },
  });

  const b = event.liquidityParamB;
  let tournamentTotalVolume = 0;
  let tournamentTotalTrades = 0;
  let tournamentTotalPayouts = 0;
  let evaluatedRoundsCount = 0;
  let correctPredictionsCount = 0;
  let sumBrierScore = 0;

  const roundsAnalysis: RoundAnalysisItem[] = rounds.map((round) => {
    const isCustomMarket = event.marketCategory !== 'CRYPTO_PRICE';
    const question =
      round.question ||
      (isCustomMarket
        ? event.name
        : `Will ${event.asset.replace('USDT', '')} close UP above the round's open strike?`);

    const openPrice = round.openPrice;
    const closePrice = round.closePrice;
    const priceDelta =
      openPrice != null && closePrice != null ? closePrice - openPrice : null;
    const priceDeltaPercent =
      openPrice != null && closePrice != null && openPrice > 0
        ? ((closePrice - openPrice) / openPrice) * 100
        : null;

    const openingProbability = 0.5;
    const finalProbability = Number(
      priceYes({ qYes: round.qYes, qNo: round.qNo }, b).toFixed(4),
    );
    const probabilityShift = Number((finalProbability - openingProbability).toFixed(4));

    let roundVolume = 0;
    let yesVolume = 0;
    let noVolume = 0;
    let yesShares = 0;
    let noShares = 0;
    let totalPayout = 0;
    const userMap = new Map<
      string,
      {
        userId: string;
        name: string;
        isBot: boolean;
        cost: number;
        payout: number;
        pnl: number;
        sharesYes: number;
        sharesNo: number;
      }
    >();

    // Reconstruct trade-by-trade probability timeline
    let runningQYes = 0;
    let runningQNo = 0;
    const probabilityTimeline: RoundAnalysisItem['probabilityTimeline'] = [];

    // Initial point at round open
    probabilityTimeline.push({
      time: (round.opensAt ?? round.createdAt).toISOString(),
      priceYes: 0.5,
    });

    for (const trade of round.trades) {
      roundVolume += trade.cost;
      totalPayout += trade.payout ?? 0;

      if (trade.side === 'YES') {
        yesVolume += trade.cost;
        yesShares += trade.shares;
        runningQYes += trade.shares;
      } else {
        noVolume += trade.cost;
        noShares += trade.shares;
        runningQNo += trade.shares;
      }

      const pAfter = Number(priceYes({ qYes: runningQYes, qNo: runningQNo }, b).toFixed(4));
      probabilityTimeline.push({
        time: trade.createdAt.toISOString(),
        priceYes: pAfter,
        side: trade.side,
        shares: trade.shares,
        cost: trade.cost,
      });

      // Participant aggregation
      const existing = userMap.get(trade.userId) ?? {
        userId: trade.userId,
        name: trade.user.name,
        isBot: trade.user.isBot,
        cost: 0,
        payout: 0,
        pnl: 0,
        sharesYes: 0,
        sharesNo: 0,
      };

      existing.cost += trade.cost;
      existing.payout += trade.payout ?? 0;
      existing.pnl = existing.payout - existing.cost;
      if (trade.side === 'YES') {
        existing.sharesYes += trade.shares;
      } else {
        existing.sharesNo += trade.shares;
      }
      userMap.set(trade.userId, existing);
    }

    tournamentTotalVolume += roundVolume;
    tournamentTotalTrades += round.trades.length;
    tournamentTotalPayouts += totalPayout;

    // Top performers sorted by PnL descending
    const topPerformers = Array.from(userMap.values())
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);

    // Calibration & accuracy computation
    const outcome = round.outcome;
    let isCorrect: boolean | null = null;
    let brierScore: number | null = null;
    let verdict = 'Pending Resolution';

    const predictedOutcome =
      finalProbability > 0.5 ? 'YES' : finalProbability < 0.5 ? 'NO' : 'EVEN';
    const confidence = Math.abs(finalProbability - 0.5) * 2; // 0 to 1

    if (round.status === 'RESOLVED') {
      if (outcome === 'YES') {
        brierScore = Number(Math.pow(finalProbability - 1, 2).toFixed(4));
        isCorrect = finalProbability >= 0.5;
        verdict =
          finalProbability >= 0.65
            ? 'Strong Crowd Accuracy (YES Predicted & Won)'
            : finalProbability >= 0.5
              ? 'Narrow Market Consensus Won (YES)'
              : 'Contrarian Upset (Market leaned NO, but YES won)';
      } else if (outcome === 'NO') {
        brierScore = Number(Math.pow(finalProbability - 0, 2).toFixed(4));
        isCorrect = finalProbability <= 0.5;
        verdict =
          finalProbability <= 0.35
            ? 'Strong Crowd Accuracy (NO Predicted & Won)'
            : finalProbability <= 0.5
              ? 'Narrow Market Consensus Won (NO)'
              : 'Contrarian Upset (Market leaned YES, but NO won)';
      } else if (outcome === 'VOID') {
        verdict = `Round Voided: ${round.voidReason || 'Market Cancelled'}`;
      }

      if (outcome === 'YES' || outcome === 'NO') {
        evaluatedRoundsCount++;
        if (isCorrect) correctPredictionsCount++;
        if (brierScore != null) sumBrierScore += brierScore;
      }
    } else if (round.status === 'TRADING' || round.status === 'LOCKED') {
      verdict = 'Round Live / In Progress';
    }

    return {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      question,
      asset: event.asset,
      openPrice,
      closePrice,
      priceDelta: priceDelta != null ? Number(priceDelta.toFixed(4)) : null,
      priceDeltaPercent: priceDeltaPercent != null ? Number(priceDeltaPercent.toFixed(2)) : null,
      outcome,
      voidReason: round.voidReason,
      openingProbability,
      finalProbability,
      probabilityShift,
      totalVolume: roundVolume,
      tradesCount: round.trades.length,
      yesVolume,
      noVolume,
      yesShares,
      noShares,
      totalPayout,
      uniqueParticipants: userMap.size,
      opensAt: round.opensAt?.toISOString() ?? null,
      locksAt: round.locksAt?.toISOString() ?? null,
      resolvedAt: round.resolvedAt?.toISOString() ?? null,
      calibration: {
        predictedOutcome,
        actualOutcome: outcome,
        isCorrect,
        brierScore,
        confidence: Number(confidence.toFixed(2)),
        verdict,
      },
      probabilityTimeline,
      topPerformers,
    };
  });

  const payload: TournamentAnalysisPayload = {
    arena: {
      id: event.id,
      code: event.code,
      name: event.name,
      asset: event.asset,
      status: event.status,
      currentRound: event.currentRound,
      totalRounds: event.totalRounds,
      startingBalance: event.startingBalance,
      liquidityParamB: event.liquidityParamB,
      collegeName: event.collegeName,
      organizerName: event.hostName ?? event.organizer.name,
    },
    summary: {
      totalVolume: tournamentTotalVolume,
      totalTrades: tournamentTotalTrades,
      resolvedRounds: evaluatedRoundsCount,
      totalRounds: event.totalRounds,
      accuracyRate:
        evaluatedRoundsCount > 0
          ? Number((correctPredictionsCount / evaluatedRoundsCount).toFixed(2))
          : null,
      correctPredictions: correctPredictionsCount,
      averageBrierScore:
        evaluatedRoundsCount > 0
          ? Number((sumBrierScore / evaluatedRoundsCount).toFixed(4))
          : null,
      totalPayouts: tournamentTotalPayouts,
    },
    rounds: roundsAnalysis,
  };

  return NextResponse.json(payload);
}
