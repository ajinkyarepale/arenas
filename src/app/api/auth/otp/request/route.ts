import { NextResponse } from 'next/server';

import { apiError, clientIp, rateLimited } from '@/lib/api';
import { logger } from '@/lib/logger';
import { normaliseEmail, requestOtp } from '@/lib/otp';
import { checkRateLimit, OTP_REQUEST_RULE } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Send a 6-digit sign-in code. Always answers OK for a well-formed address —
 * whether the account exists stays hidden, and login and signup share the
 * same code step.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIp(request);
    const gate = checkRateLimit(`otp:http:${ip}`, { ...OTP_REQUEST_RULE, limit: 30 });
    if (!gate.ok) return rateLimited(gate.retryAfterMs);

    let email: string | null = null;
    try {
      const body = (await request.json()) as { email?: unknown };
      email = typeof body.email === 'string' ? normaliseEmail(body.email) : null;
    } catch {
      email = null;
    }
    if (!email) return apiError('Enter a valid email address.', 400);

    const result = await requestOtp(email, ip);
    if (!result.ok) {
      return apiError(result.error ?? 'Could not send a code right now.', 429);
    }
    logger.info('otp requested');
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('otp request failed', {
      code: (error as { code?: string })?.code ?? 'unknown',
      message: error instanceof Error ? error.message.slice(0, 200) : 'unknown',
    });
    return apiError('Could not send a code right now. Try again in a minute.', 500);
  }
}
