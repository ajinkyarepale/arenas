import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { createAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const applySchema = z.object({
  collegeName: z.string().trim().min(3, 'College / Institution name must be at least 3 characters'),
  clubName: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  eventDetails: z.string().trim().optional(),
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requests = await prisma.organizerRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      role: user.role,
      requests,
      latestRequest: requests[0] || null,
    });
  } catch (error) {
    console.error('[/api/host/apply GET] Failed to fetch request status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 });
    }

    // If user is already an organizer or admin
    if (user.role === 'ORGANIZER' || user.role === 'SUPERADMIN' || user.role === 'ADMIN') {
      return NextResponse.json(
        { message: 'You already have organizer privileges.', role: user.role },
        { status: 200 }
      );
    }

    const body = await request.json();
    const parsed = applySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid application data' },
        { status: 400 }
      );
    }

    // Check for pending request
    const existingPending = await prisma.organizerRequest.findFirst({
      where: {
        userId: user.id,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: 'You already have a pending organizer application under review.' },
        { status: 400 }
      );
    }

    const organizerRequest = await prisma.organizerRequest.create({
      data: {
        userId: user.id,
        collegeName: parsed.data.collegeName,
        clubName: parsed.data.clubName || null,
        designation: parsed.data.designation || null,
        contactPhone: parsed.data.contactPhone || null,
        eventDetails: parsed.data.eventDetails || null,
        status: 'PENDING',
      },
    });

    void createAuditLog({
      actorId: user.id,
      action: 'PERMISSIONS_UPDATED',
      resourceType: 'USER',
      resourceId: organizerRequest.id,
      metadata: {
        type: 'ORGANIZER_APPLICATION',
        collegeName: parsed.data.collegeName,
        clubName: parsed.data.clubName,
      },
    });

    return NextResponse.json({
      success: true,
      request: organizerRequest,
      message: 'Your application has been submitted to Our Team for approval.',
    });
  } catch (error) {
    console.error('[/api/host/apply POST] Failed to submit application:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit application' },
      { status: 500 }
    );
  }
}
