import { NextResponse } from 'next/server';

import { requireUser, unauthorized } from '@/lib/api';
import { getProfile } from '@/lib/profile';

export const dynamic = 'force-dynamic';

/** The signed-in user's arenas and career stats. */
export async function GET() {
  const user = await requireUser();
  if (!user) return unauthorized();

  const profile = await getProfile(user.id);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    ...profile,
  });
}
