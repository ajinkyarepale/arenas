import { NextResponse } from 'next/server';

import { apiError, clientIp, parseBody, rateLimited } from '@/lib/api';
import { hashPassword } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, SIGNUP_RULE } from '@/lib/rate-limit';
import { signUpSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const limit = checkRateLimit(`signup:${clientIp(request)}`, SIGNUP_RULE);
  if (!limit.ok) return rateLimited(limit.retryAfterMs);

  const parsed = await parseBody(request, signUpSchema);
  if (!parsed.ok) return parsed.response;

  const { name, email, password, wantsOrganizer } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return apiError('An account with that email already exists.', 409, {
      email: 'That email is already registered',
    });
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: wantsOrganizer ? 'ORGANIZER' : 'PARTICIPANT',
    },
    // Explicit select: the hash must never leave the server, not even by
    // accident through a spread of the full record.
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
