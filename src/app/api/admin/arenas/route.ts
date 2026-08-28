import { NextResponse } from 'next/server';

import { apiError, forbidden, parseBody, rateLimited, unauthorized, requireOrganizer } from '@/lib/api';
import { generateUniqueJoinCode } from '@/lib/codes';
import { symbolExists } from '@/lib/price/binance';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, CREATE_ARENA_RULE } from '@/lib/rate-limit';
import { createArenaSchema } from '@/lib/validation';

import { PermissionKey } from '@/generated/client';
import { can } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** List the arenas this organizer runs. */
export async function GET() {
  const { user } = await requireOrganizer();
  if (!user) return unauthorized();

  const canViewAll = await can(user, PermissionKey.ARENA_VIEW_ALL);
  const where = canViewAll ? {} : { organizerId: user.id };

  const arenas = await prisma.event.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      code: true,
      name: true,
      asset: true,
      status: true,
      totalRounds: true,
      currentRound: true,
      roundDurationSec: true,
      startingBalance: true,
      scheduledFor: true,
      startedAt: true,
      endsAt: true,
      createdAt: true,
      organizer: { select: { name: true } },
      _count: { select: { participants: true, trades: true } },
    },
  });

  return NextResponse.json({
    arenas: arenas.map((arena) => ({
      ...arena,
      scheduledFor: arena.scheduledFor?.toISOString() ?? null,
      startedAt: arena.startedAt?.toISOString() ?? null,
      endsAt: arena.endsAt?.toISOString() ?? null,
      createdAt: arena.createdAt.toISOString(),
      participantCount: arena._count.participants,
      tradeCount: arena._count.trades,
    })),
  });
}

/** Create a new arena. */
export async function POST(request: Request) {
  const { user } = await requireOrganizer();
  if (!user) return unauthorized();

  const permitted = await can(user, PermissionKey.ARENA_CREATE);
  if (!permitted) return forbidden('You do not have permission to create arenas.');

  const limit = checkRateLimit(`create-arena:${user.id}`, CREATE_ARENA_RULE);
  if (!limit.ok) return rateLimited(limit.retryAfterMs);

  const parsed = await parseBody(request, createArenaSchema);
  if (!parsed.ok) return parsed.response;

  const input = parsed.data;

  // Fail here rather than at the first round open, when a room is watching.
  if (input.marketCategory === 'CRYPTO_PRICE' && !(await symbolExists(input.asset))) {
    return apiError(`Binance does not list ${input.asset}.`, 422, {
      asset: 'Unknown symbol on Binance',
    });
  }

  let code: string;
  if (input.code) {
    const taken = await prisma.event.findUnique({
      where: { code: input.code },
      select: { id: true },
    });
    if (taken) {
      return apiError('That join code is already in use.', 409, {
        code: 'Already in use — pick another',
      });
    }
    code = input.code;
  } else {
    code = await generateUniqueJoinCode(async (candidate) => {
      const hit = await prisma.event.findUnique({
        where: { code: candidate },
        select: { id: true },
      });
      return hit !== null;
    });
  }

  const isCustom = input.marketCategory !== 'CRYPTO_PRICE';

  const arena = await prisma.event.create({
    data: {
      code,
      name: input.name,
      description: input.description || null,
      hostName: input.hostName || null,
      organizerId: user.id,
      marketCategory: input.marketCategory,
      question: input.question || null,
      resolutionCriteria: input.resolutionCriteria || null,
      isManualResolution: isCustom,
      collegeName: input.collegeName || null,
      collegeLogoUrl: input.collegeLogoUrl || null,
      themeColor: input.themeColor || null,
      enableBots: Boolean(input.enableBots),
      botIntensity: input.botIntensity || 'BALANCED',
      asset: isCustom ? (input.asset || 'CUSTOM') : input.asset,
      roundDurationSec: input.roundDurationSec,
      lockBufferSec: input.lockBufferSec,
      totalRounds: input.totalRounds,
      startingBalance: input.startingBalance,
      liquidityParamB: input.liquidityParamB,
      maxStakePerTrade: input.maxStakePerTrade,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
      // Arenas open in LOBBY so participants can join and settle in before the
      // first round opens.
      status: 'LOBBY',
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      marketCategory: true,
      asset: true,
      collegeName: true,
      collegeLogoUrl: true,
      enableBots: true,
    },
  });

  void createAuditLog({
    actorId: user.id,
    action: 'ARENA_CREATED',
    resourceType: 'EVENT',
    resourceId: arena.id,
    metadata: {
      code: arena.code,
      name: arena.name,
      asset: arena.asset,
      marketCategory: arena.marketCategory,
    },
  });

  return NextResponse.json({ arena }, { status: 201 });
}
