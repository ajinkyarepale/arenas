import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { EmailError } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, OTP_REQUEST_RULE, OTP_VERIFY_RULE } from '@/lib/rate-limit';

export const OTP_TTL_MS = 10 * 60_000;
export const OTP_MAX_ATTEMPTS = 5;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

export function normaliseEmail(raw: string): string | null {
  const parsed = emailSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function hashCode(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export interface OtpRequestResult {
  ok: boolean;
  /** Seconds to wait before requesting another code (min-interval). */
  retryAfterMs?: number;
  error?: string;
}

/**
 * Issue a fresh 6-digit code. Any live codes for the address are consumed
 * first, so only the newest email ever works. Throws EmailError when the
 * provider refuses the send — the code row is removed so a retry works cleanly.
 */
export async function requestOtp(email: string, ip: string): Promise<OtpRequestResult> {
  const byEmail = checkRateLimit(`otp:req:${email}`, OTP_REQUEST_RULE);
  if (!byEmail.ok) return { ok: false, retryAfterMs: byEmail.retryAfterMs, error: 'Too many codes requested. Try again shortly.' };
  const byIp = checkRateLimit(`otp:reqip:${ip}`, { ...OTP_REQUEST_RULE, limit: 20 });
  if (!byIp.ok) return { ok: false, retryAfterMs: byIp.retryAfterMs, error: 'Too many codes requested. Try again shortly.' };

  const code = String(randomInt(100_000, 1_000_000));
  const now = new Date();

  await prisma.otpCode.updateMany({
    where: { email, consumedAt: null, expiresAt: { gt: now } },
    data: { consumedAt: now },
  });

  const row = await prisma.otpCode.create({
    data: {
      email,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
    select: { id: true },
  });

  try {
    const { sendOtpEmail } = await import('@/lib/email');
    await sendOtpEmail(email, code);
  } catch (error) {
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => undefined);
    if (error instanceof EmailError) return { ok: false, error: 'Could not send the email. Try again in a minute.' };
    throw error;
  }

  return { ok: true };
}

export interface OtpVerifyResult {
  ok: boolean;
  user?: { id: string; name: string | null; email: string; role: 'PARTICIPANT' | 'ORGANIZER' | 'SUPERADMIN' };
  error?: string;
}

/**
 * Redeem a code. Burns it on success; counts attempts and burns after
 * OTP_MAX_ATTEMPTS failures. Unknown addresses create a PARTICIPANT account
 * (passwordless — `passwordHash` stays null, so password login is impossible).
 */
export async function verifyOtp(
  email: string,
  code: string,
  ip: string,
  displayName?: string,
): Promise<OtpVerifyResult> {
  const gate = checkRateLimit(`otp:verify:${ip}:${email}`, OTP_VERIFY_RULE);
  if (!gate.ok) return { ok: false, error: 'Too many attempts. Request a fresh code.' };

  const row = await prisma.otpCode.findFirst({
    where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!row) return { ok: false, error: 'That code is expired or was already used. Request a new one.' };

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    return { ok: false, error: 'Too many wrong guesses. Request a new code.' };
  }

  const clean = code.trim();
  if (!/^\d{6}$/.test(clean) || !safeEqual(hashCode(clean), row.codeHash)) {
    await prisma.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: 'That code does not match. Check the latest email.' };
  }

  await prisma.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return {
      ok: true,
      user: { id: existing.id, name: existing.name, email: existing.email, role: existing.role },
    };
  }

  const name = displayName?.trim().slice(0, 80) || email.split('@')[0] || 'Trader';
  const created = await prisma.user.create({
    data: { name, email, role: 'PARTICIPANT' },
    select: { id: true, name: true, email: true, role: true },
  });
  return { ok: true, user: created };
}
