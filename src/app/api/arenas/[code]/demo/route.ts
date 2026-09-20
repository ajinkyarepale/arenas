import { NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';
import { notFound, requireUser } from '@/lib/api';
import { isOrganizer } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';
import { AuditAction, RoleType } from '@/generated/client';
import {
  ensureDemoParticipants,
  getDemoMetrics,
  resetDemoRoom,
} from '@/lib/engine/demo-controller';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
    select: { id: true, mode: true, demoStatus: true, status: true, currentRound: true, liquidityParamB: true },
  });

  if (!event) return notFound('No arena with that code.');

  const metrics = getDemoMetrics(event.id);
  const round = event.currentRound > 0
    ? await prisma.round.findUnique({
        where: { eventId_roundNumber: { eventId: event.id, roundNumber: event.currentRound } },
        select: { qYes: true, qNo: true, openPrice: true, locksAt: true, status: true },
      })
    : null;

  return NextResponse.json({
    event,
    round,
    metrics,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { code: string } },
) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return notFound('That arena code is not valid.');

  const user = await requireUser();
  if (!user || !isOrganizer(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const event = await prisma.event.findUnique({
    where: { code: parsed.data },
  });
  if (!event) return notFound('No arena with that code.');

  const body = await request.json().catch(() => ({}));
  const action = body.action as 'START' | 'STOP' | 'PAUSE' | 'RESUME' | 'RESET';

  switch (action) {
    case 'START':
      await prisma.event.update({
        where: { id: event.id },
        data: {
          mode: 'DEMO',
          demoStatus: 'ACTIVE',
          status: 'LIVE',
        },
      });
      await ensureDemoParticipants(event.id, 60, event.startingBalance);
      await createAuditLog({
        actorId: user.id,
        action: AuditAction.ARENA_STATUS_CHANGED,
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { demoAction: 'START', code: event.code, name: event.name },
      });
      break;

    case 'PAUSE':
      await prisma.event.update({
        where: { id: event.id },
        data: { demoStatus: 'PAUSED' },
      });
      await createAuditLog({
        actorId: user.id,
        action: AuditAction.ARENA_STATUS_CHANGED,
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { demoAction: 'PAUSE', code: event.code },
      });
      break;

    case 'RESUME':
      await prisma.event.update({
        where: { id: event.id },
        data: { demoStatus: 'ACTIVE' },
      });
      await createAuditLog({
        actorId: user.id,
        action: AuditAction.ARENA_STATUS_CHANGED,
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { demoAction: 'RESUME', code: event.code },
      });
      break;

    case 'STOP':
      await prisma.event.update({
        where: { id: event.id },
        data: { demoStatus: 'STOPPED' },
      });
      await createAuditLog({
        actorId: user.id,
        action: AuditAction.ARENA_STATUS_CHANGED,
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { demoAction: 'STOP', code: event.code },
      });
      break;

    case 'RESET':
      await resetDemoRoom(event.id);
      await createAuditLog({
        actorId: user.id,
        action: AuditAction.ARENA_STATUS_CHANGED,
        resourceType: 'EVENT',
        resourceId: event.id,
        metadata: { demoAction: 'RESET', code: event.code },
      });
      break;

    default:
      return NextResponse.json({ error: 'Invalid demo action' }, { status: 400 });
  }

  const updated = await prisma.event.findUnique({ where: { id: event.id } });
  return NextResponse.json({ ok: true, event: updated });
}
