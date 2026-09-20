import { NextResponse } from 'next/server';

import { forbidden, requireOrganizer, unauthorized } from '@/lib/api';
import { getPosition } from '@/lib/engine/trading';
import { prisma } from '@/lib/prisma';
import { RoleType } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const { user, allowed } = await requireOrganizer();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Only organizers can view bot details.');

  const code = params.code;
  const event = await prisma.event.findUnique({
    where: { code },
  });

  if (!event) {
    return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
  }

  if (user.role !== RoleType.SUPERADMIN && user.role !== RoleType.ADMIN && event.organizerId !== user.id) {
    return forbidden('You do not own this arena.');
  }

  const botUser = await prisma.user.findFirst({
    where: { isBot: true },
  });

  if (!botUser) {
    return NextResponse.json({
      botsEnabled: event.botsEnabled || event.enableBots,
      botStatus: event.botStatus,
      botStartingBalance: event.botStartingBalance,
      botMaxExposure: event.botMaxExposure,
      botStrategy: event.botStrategy,
      balance: event.botStartingBalance,
      yesShares: 0,
      noShares: 0,
      netExposure: 0,
      tradeCount: 0,
    });
  }

  const botParticipant = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId: event.id, userId: botUser.id } },
  });

  let botPosition = { yesShares: 0, noShares: 0, yesCost: 0, noCost: 0, totalStaked: 0 };
  let tradeCount = 0;

  if (botParticipant && event.currentRound > 0) {
    const round = await prisma.round.findUnique({
      where: { eventId_roundNumber: { eventId: event.id, roundNumber: event.currentRound } },
    });
    if (round) {
      botPosition = await getPosition(round.id, botParticipant.id);
    }
    tradeCount = await prisma.trade.count({
      where: { eventId: event.id, userId: botUser.id },
    });
  }

  const netExposure = Math.abs(botPosition.yesCost - botPosition.noCost);

  return NextResponse.json({
    botsEnabled: event.botsEnabled || event.enableBots,
    botStatus: event.botStatus,
    botStartingBalance: event.botStartingBalance,
    botMaxExposure: event.botMaxExposure,
    botStrategy: event.botStrategy,
    balance: botParticipant?.balance ?? event.botStartingBalance,
    yesShares: botPosition.yesShares,
    noShares: botPosition.noShares,
    netExposure,
    tradeCount,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { code: string } },
) {
  const { user, allowed } = await requireOrganizer();
  if (!user) return unauthorized();
  if (!allowed) return forbidden('Only organizers can manage bot status.');

  const code = params.code;
  const event = await prisma.event.findUnique({
    where: { code },
  });

  if (!event) {
    return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
  }

  if (user.role !== RoleType.SUPERADMIN && user.role !== RoleType.ADMIN && event.organizerId !== user.id) {
    return forbidden('You do not own this arena.');
  }

  const body = await request.json().catch(() => ({}));
  const { action, status: targetStatus } = body;

  let newStatus = event.botStatus;

  if (action === 'PAUSE' || targetStatus === 'PAUSED') {
    newStatus = 'PAUSED';
  } else if (action === 'RESUME' || action === 'START' || targetStatus === 'ACTIVE') {
    newStatus = 'ACTIVE';
  } else if (action === 'STOP' || targetStatus === 'STOPPED') {
    newStatus = 'STOPPED';
  } else {
    return NextResponse.json({ error: 'Invalid action. Use PAUSE, RESUME, or STOP.' }, { status: 400 });
  }

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: { botStatus: newStatus },
  });

  return NextResponse.json({
    ok: true,
    botStatus: updated.botStatus,
  });
}
