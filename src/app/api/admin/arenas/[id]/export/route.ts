import { NextResponse } from 'next/server';

import { requireUser } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { can } from '@/lib/auth/rbac';
import { PermissionKey } from '@/generated/client';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const arena = await prisma.event.findFirst({
      where: {
        OR: [{ id }, { code: id.toUpperCase() }],
      },
      include: {
        organizer: { select: { name: true, email: true } },
        participants: {
          orderBy: { balance: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            trades: { select: { id: true, payout: true, cost: true } },
          },
        },
      },
    });

    if (!arena) {
      return NextResponse.json({ error: 'Arena not found' }, { status: 404 });
    }

    // Check permission
    const hasGlobalAccess = await can(user, PermissionKey.ARENA_MANAGE_ALL);
    const isOwner = arena.organizerId === user.id;
    if (!hasGlobalAccess && !isOwner && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to export standings' }, { status: 403 });
    }

    // Build CSV content
    const headers = [
      'Rank',
      'Participant Name',
      'Email / ID',
      'Final Points',
      'Starting Balance',
      'Net Profit / Loss',
      'ROI %',
      'Total Trades Placed',
      'Winning Trades',
      'Win Rate %',
      'Joined At (IST)',
    ];

    const startingBal = arena.startingBalance;

    const rows = arena.participants.map((p, index) => {
      const rank = index + 1;
      const totalTrades = p.trades.length;
      const winningTrades = p.trades.filter((t) => (t.payout ?? 0) > 0).length;
      const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0.0';
      const netPnl = (p.balance - startingBal).toFixed(2);
      const roi = (((p.balance - startingBal) / startingBal) * 100).toFixed(1);
      const joinedDate = new Date(p.joinedAt).toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
      });

      return [
        rank,
        `"${p.user.name.replace(/"/g, '""')}"`,
        `"${p.user.email}"`,
        p.balance.toFixed(2),
        startingBal.toFixed(2),
        netPnl,
        `${roi}%`,
        totalTrades,
        winningTrades,
        `${winRate}%`,
        `"${joinedDate}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const filename = `Arena_${arena.code}_${arena.name.replace(/[^a-zA-Z0-9]/g, '_')}_Standings.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[/api/admin/arenas/export GET] Failed to export standings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    );
  }
}
