import { NextResponse } from 'next/server';

import { apiError, forbidden, notFound, parseBody, requireOrganizer, unauthorized } from '@/lib/api';
import { endEvent, pauseEvent, startEvent } from '@/lib/engine/round-engine';
import { prisma } from '@/lib/prisma';
import { updateArenaSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

/**
 * Confirm the caller may manage this specific arena. An ORGANIZER owns only the
 * arenas they created; a SUPERADMIN may manage any. Every handler below goes
 * through this — the tenancy boundary is enforced per request, not by hiding
 * buttons in the UI.
 */
import { PermissionKey } from '@/generated/client';
import { can } from '@/lib/auth/rbac';
import { createAuditLog } from '@/lib/audit';

async function authorise(id: string, requiredPermission: PermissionKey = PermissionKey.ARENA_MANAGE_OWN) {
  const { user } = await requireOrganizer();
  if (!user) return { error: unauthorized() } as const;

  const arena = await prisma.event.findFirst({
    where: {
      OR: [
        { id },
        { code: id },
        { code: `AR-${id.replace(/^AR-/, '')}` },
        { code: id.replace(/^AR-/, '') },
      ],
    },
  });
  if (!arena) return { error: notFound('No such arena.') } as const;

  const permitted = await can(user, requiredPermission, { organizerId: arena.organizerId });
  if (!permitted) {
    return { error: forbidden('You do not have permission to manage this arena.') } as const;
  }

  return { user, arena } as const;
}

/** Full management view: participants, balances, and the live trade tape. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await authorise(params.id);
    if ('error' in result) return result.error;
    const { arena } = result;

    const [participants, rounds, recentTrades] = await Promise.all([
      prisma.eventParticipant.findMany({
        where: { eventId: arena.id },
        orderBy: { balance: 'desc' },
        select: {
          id: true,
          balance: true,
          joinedAt: true,
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { trades: true } },
        },
      }),
      prisma.round.findMany({
        where: { eventId: arena.id },
        orderBy: { roundNumber: 'asc' },
        select: {
          id: true,
          roundNumber: true,
          status: true,
          openPrice: true,
          closePrice: true,
          outcome: true,
          voidReason: true,
          qYes: true,
          qNo: true,
          opensAt: true,
          locksAt: true,
          resolvesAt: true,
        },
      }),
      prisma.trade.findMany({
        where: { eventId: arena.id },
        orderBy: { createdAt: 'desc' },
        take: 60,
        select: {
          id: true,
          side: true,
          shares: true,
          cost: true,
          priceAtFill: true,
          payout: true,
          createdAt: true,
          user: { select: { name: true } },
          round: { select: { roundNumber: true } },
        },
      }),
    ]);

    return NextResponse.json({
      arena: {
        ...arena,
        scheduledFor: arena.scheduledFor?.toISOString() ?? null,
        startedAt: arena.startedAt?.toISOString() ?? null,
        endsAt: arena.endsAt?.toISOString() ?? null,
        resolvedOutcome: arena.resolvedOutcome ?? null,
        resolvedAt: arena.resolvedAt?.toISOString() ?? null,
        createdAt: arena.createdAt.toISOString(),
        updatedAt: arena.updatedAt.toISOString(),
      },
      participants: participants.map((p) => ({
        id: p.id,
        name: p.user?.name ?? 'Participant',
        email: p.user?.email ?? '',
        balance: p.balance,
        tradeCount: p._count?.trades ?? 0,
        joinedAt: p.joinedAt?.toISOString() ?? new Date().toISOString(),
      })),
      rounds: rounds.map((r) => ({
        ...r,
        opensAt: r.opensAt?.toISOString() ?? null,
        locksAt: r.locksAt?.toISOString() ?? null,
        resolvesAt: r.resolvesAt?.toISOString() ?? null,
      })),
      recentTrades: recentTrades.map((t) => ({
        id: t.id,
        side: t.side,
        shares: t.shares,
        cost: t.cost,
        priceAtFill: t.priceAtFill,
        payout: t.payout,
        trader: t.user?.name ?? 'Trader',
        roundNumber: t.round?.roundNumber ?? 1,
        at: t.createdAt?.toISOString() ?? new Date().toISOString(),
      })),
    });
  } catch (error) {
    console.error(`[/api/admin/arenas/${params.id} GET] error:`, error);
    return apiError('Failed to load arena management data. Please try again.', 500);
  }
}

/** Session control: start, pause, end, or publish a draft. */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await authorise(params.id);
    if ('error' in result) return result.error;
    const { user, arena } = result;

    const parsed = await parseBody(request, updateArenaSchema);
    if (!parsed.ok) return parsed.response;

    void createAuditLog({
      actorId: user.id,
      action: 'ARENA_UPDATED',
      resourceType: 'EVENT',
      resourceId: arena.id,
      metadata: { action: parsed.data.action, tradesPerMinuteLimit: parsed.data.tradesPerMinuteLimit },
    });

    if (parsed.data.tradesPerMinuteLimit !== undefined) {
      if (arena.status === 'LIVE' || arena.status === 'ENDED') {
        return apiError('Submission rules must be configured before starting the round.', 400);
      }
      const updated = await prisma.event.update({
        where: { id: arena.id },
        data: { tradesPerMinuteLimit: parsed.data.tradesPerMinuteLimit },
      });
      if (!parsed.data.action || parsed.data.action === 'update-rules') {
        return NextResponse.json({ arena: updated });
      }
    }

    const action = parsed.data.action ?? (parsed.data.status ? 'set-status' : undefined);

    switch (action) {
      case 'set-status': {
        const target = parsed.data.status;
        if (!target) return apiError('Status is required for set-status action.', 400);

        if (target === 'LIVE') {
          if (arena.status === 'LIVE') return NextResponse.json({ arena });
          if (arena.status === 'ENDED') return apiError('This arena has already finished.', 409);
          const started = await startEvent(arena.id);
          void createAuditLog({
            actorId: user.id,
            action: 'ARENA_STATUS_CHANGED',
            resourceType: 'EVENT',
            resourceId: arena.id,
            previousData: { status: arena.status },
            newData: { status: 'LIVE' },
            metadata: { code: arena.code, name: arena.name, action: 'start' },
          });
          return NextResponse.json({
            arena: { id: started.id, status: started.status, currentRound: started.currentRound },
          });
        }

        if (target === 'PAUSED') {
          if (arena.status === 'LIVE') {
            await pauseEvent(arena.id);
          }
          const updated = await prisma.event.update({
            where: { id: arena.id },
            data: { status: 'PAUSED' },
            select: { id: true, status: true, currentRound: true },
          });
          void createAuditLog({
            actorId: user.id,
            action: 'ARENA_STATUS_CHANGED',
            resourceType: 'EVENT',
            resourceId: arena.id,
            previousData: { status: arena.status },
            newData: { status: 'PAUSED' },
            metadata: { code: arena.code, name: arena.name, action: 'pause' },
          });
          return NextResponse.json({ arena: updated });
        }

        if (target === 'LOBBY') {
          if (arena.status === 'LIVE') {
            await pauseEvent(arena.id);
          }
          const updated = await prisma.event.update({
            where: { id: arena.id },
            data: { status: 'LOBBY' },
            select: { id: true, status: true, currentRound: true },
          });
          void createAuditLog({
            actorId: user.id,
            action: 'ARENA_STATUS_CHANGED',
            resourceType: 'EVENT',
            resourceId: arena.id,
            previousData: { status: arena.status },
            newData: { status: 'LOBBY' },
            metadata: { code: arena.code, name: arena.name, action: 'lobby' },
          });
          return NextResponse.json({ arena: updated });
        }

        if (target === 'ENDED') {
          if (arena.status === 'ENDED') return NextResponse.json({ arena });
          const ended = await endEvent(arena.id);
          void createAuditLog({
            actorId: user.id,
            action: 'ARENA_STATUS_CHANGED',
            resourceType: 'EVENT',
            resourceId: arena.id,
            previousData: { status: arena.status },
            newData: { status: 'ENDED' },
            metadata: { code: arena.code, name: arena.name, action: 'end' },
          });
          return NextResponse.json({
            arena: { id: ended.id, status: ended.status, currentRound: ended.currentRound },
          });
        }

        if (target === 'ARCHIVED') {
          if (user.role !== 'SUPERADMIN') {
            return forbidden('Only a superadmin can archive arenas.');
          }
          const archived = await prisma.event.update({
            where: { id: arena.id },
            data: { status: 'ARCHIVED' },
            select: { id: true, status: true, currentRound: true },
          });
          void createAuditLog({
            actorId: user.id,
            action: 'ARENA_STATUS_CHANGED',
            resourceType: 'EVENT',
            resourceId: arena.id,
            previousData: { status: arena.status },
            newData: { status: 'ARCHIVED' },
            metadata: { code: arena.code, name: arena.name, action: 'archive' },
          });
          return NextResponse.json({ arena: archived });
        }

        if (target === 'DRAFT') {
          const updated = await prisma.event.update({
            where: { id: arena.id },
            data: { status: 'DRAFT' },
            select: { id: true, status: true, currentRound: true },
          });
          return NextResponse.json({ arena: updated });
        }

        return apiError('Unsupported target status.', 400);
      }

      case 'update-rules': {
        return NextResponse.json({ arena });
      }

      case 'publish': {
        if (arena.status !== 'DRAFT') {
          return apiError('This arena is already published.', 409);
        }
        const updated = await prisma.event.update({
          where: { id: arena.id },
          data: { status: 'LOBBY' },
          select: { id: true, status: true },
        });
        return NextResponse.json({ arena: updated });
      }

      case 'start':
      case 'start-round':
      case 'resume': {
        if (arena.status === 'ENDED') {
          return apiError('This arena has already finished.', 409);
        }
        if (arena.status === 'LIVE') {
          return apiError('This arena is already live.', 409);
        }
        if (arena.currentRound >= arena.totalRounds) {
          return apiError('Every round in this arena has already been played.', 409);
        }
        const started = await startEvent(arena.id);
        return NextResponse.json({
          arena: { id: started.id, status: started.status, currentRound: started.currentRound },
        });
      }

      case 'pause': {
        if (arena.status !== 'LIVE') {
          return apiError('This arena is not running.', 409);
        }
        const paused = await pauseEvent(arena.id);
        return NextResponse.json({
          arena: { id: paused.id, status: paused.status, currentRound: paused.currentRound },
        });
      }

      case 'end': {
        if (arena.status === 'ENDED') {
          return apiError('This arena has already finished.', 409);
        }
        const ended = await endEvent(arena.id);
        return NextResponse.json({
          arena: { id: ended.id, status: ended.status, currentRound: ended.currentRound },
        });
      }

      case 'archive': {
        // Only SUPERADMIN can archive arenas.
        if (user.role !== 'SUPERADMIN') {
          return forbidden('Only a superadmin can archive arenas.');
        }
        if (arena.status === 'ARCHIVED') {
          return apiError('This arena is already archived.', 409);
        }
        const archived = await prisma.event.update({
          where: { id: arena.id },
          data: { status: 'ARCHIVED' },
          select: { id: true, status: true },
        });
        void createAuditLog({
          actorId: user.id,
          action: 'ARENA_STATUS_CHANGED',
          resourceType: 'EVENT',
          resourceId: arena.id,
          previousData: { status: arena.status },
          newData: { status: 'ARCHIVED' },
          metadata: { code: arena.code, name: arena.name, action: 'archive' },
        });
        return NextResponse.json({ arena: archived });
      }

      case 'unarchive': {
        // Only SUPERADMIN can unarchive arenas.
        if (user.role !== 'SUPERADMIN') {
          return forbidden('Only a superadmin can unarchive arenas.');
        }
        if (arena.status !== 'ARCHIVED') {
          return apiError('This arena is not archived.', 409);
        }
        const unarchived = await prisma.event.update({
          where: { id: arena.id },
          data: { status: 'ENDED' },
          select: { id: true, status: true },
        });
        void createAuditLog({
          actorId: user.id,
          action: 'ARENA_STATUS_CHANGED',
          resourceType: 'EVENT',
          resourceId: arena.id,
          previousData: { status: 'ARCHIVED' },
          newData: { status: 'ENDED' },
          metadata: { code: arena.code, name: arena.name, action: 'unarchive' },
        });
        return NextResponse.json({ arena: unarchived });
      }

      default:
        return apiError('Unknown action.', 400);
    }
  } catch (error) {
    console.error(`[/api/admin/arenas/${params.id} POST] error:`, error);
    return apiError('Failed to execute arena action. Please try again.', 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  return POST(request, context);
}

/** Delete an arena and its associated rounds, trades, and participant records. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const result = await authorise(params.id, PermissionKey.ARENA_DELETE_OWN);
    if ('error' in result) return result.error;
    const { user, arena } = result;

    await prisma.event.delete({
      where: { id: arena.id },
    });

    void createAuditLog({
      actorId: user.id,
      action: 'ARENA_DELETED',
      resourceType: 'EVENT',
      resourceId: arena.id,
      metadata: { code: arena.code, name: arena.name },
    });

    return NextResponse.json({ success: true, deletedId: arena.id });
  } catch (error) {
    console.error(`[/api/admin/arenas/${params.id} DELETE] error:`, error);
    return apiError('Failed to delete arena.', 500);
  }
}

