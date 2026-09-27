# Security policy

## Scope

The Arenas platform in this repository: Next.js app, API routes, scheduler,
and Prisma schema. Educational software handling virtual credits only — no
real money, no payments, no PII beyond name/email.

## Reporting a vulnerability

Email the repository owner with `[SECURITY]` in the subject, including steps
to reproduce and impact. Please allow 14 days for a fix before any disclosure.
Do not probe the production deployment with brute-force or destructive traffic;
verify against a local instance (`npm run db:dev`, `npm run db:seed`).

## What is enforced (and tested or reviewed)

- Passwords: bcrypt cost 12, never logged, never selected out of the database
  (explicit Prisma selects). Null hash for OAuth/OTP-only accounts, which can
  never password-login.
- Auth errors are generic (no user enumeration by message or timing — a dummy
  bcrypt comparison always runs). OTP codes are SHA-256 stored, 10-minute
  life, burned after 5 guesses or first use.
- Every state-changing route checks the session server-side; admin routes
  re-check the role; organizers are scoped to their own arenas with 404 (not
  403) on foreign ids. Middleware is a convenience layer only.
- All inputs validated with zod at the edge (see `src/lib/validation.ts`,
  covered by `src/lib/validation.test.ts`).
- Rate limits on trades, joins, signup, arena creation, OTP (see
  `src/lib/rate-limit.ts`, covered by `src/lib/rate-limit.test.ts`).
- Dependencies: Dependabot weekly (npm + Actions). See `npm audit` status
  below before each event.

## Known risks (tracked, not hidden)

- **Next.js 14 advisories** (PostCSS chain, critical): only fixable by the
  breaking Next 16 upgrade. Build-time exposure; upgrade is scheduled, not
  ignored. Do not `npm audit fix --force` blindly — it rewrites the framework.
- **Single instance**: scheduler, trade mutex and limiters are in-process.
  Never run two app instances against one database.
- **Log fallback for OTP codes** when `RESEND_API_KEY` is unset: local-dev
  only. Production without a mailer means passwordless login is unusable —
  fail closed, never email codes from an unverified sender.

## Supported versions

Only `main` is supported. Pin production deploys to a tested commit;
`npm run typecheck && npm test && npm run build` must pass (enforced by CI).
