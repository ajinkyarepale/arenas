import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth, isOrganizer } from '@/lib/auth';
import { formatZodError } from '@/lib/validation';
import { RoleType } from '@/generated/client';

/**
 * Shared plumbing for API route handlers: consistent error envelopes, session
 * checks that run on the server, and body parsing that always goes through a
 * zod schema.
 */

export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string>;
}

export function apiError(
  message: string,
  status: number,
  fields?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, ...(fields ? { fields } : {}) }, { status });
}

export const unauthorized = () => apiError('You need to sign in to do that.', 401);
export const forbidden = (message = 'You do not have access to that.') =>
  apiError(message, 403);
export const notFound = (message = 'Not found.') => apiError(message, 404);

/**
 * Require a signed-in user. Always server-side via getServerSession — a
 * client-side check is a UI convenience, never an access control.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/** Require an organizer or superadmin. */
export async function requireOrganizer() {
  const user = await requireUser();
  if (!user) return { user: null, allowed: false } as const;
  return { user, allowed: isOrganizer(user.role) } as const;
}

/** Require a superadmin or admin. */
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (!user) return { user: null, allowed: false } as const;
  const roleStr = user.role as string;
  const allowed = roleStr === RoleType.SUPERADMIN || roleStr === RoleType.ADMIN;
  return { user, allowed } as const;
}

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/** Parse and validate a JSON body. Rejects malformed JSON before zod sees it. */
export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: apiError('Expected a JSON body.', 400) };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const { message, fields } = formatZodError(parsed.error);
    return { ok: false, response: apiError(message, 422, fields) };
  }

  return { ok: true, data: parsed.data };
}

/** Best-effort client IP, for limiters that key on origin rather than user. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

export function rateLimited(retryAfterMs: number): NextResponse<ApiErrorBody> {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return NextResponse.json(
    { error: `Slow down — try again in ${seconds}s.` },
    { status: 429, headers: { 'Retry-After': String(seconds) } },
  );
}
