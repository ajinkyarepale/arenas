# Arenas API reference

All routes live under `src/app/api/`. Every request and response is JSON
unless noted. Errors share one envelope: `{ "error": string, "fields?":
Record<string, string> }`. Validation failures are 400/422 with per-field
messages; rate limiting answers 429 with a `Retry-After` header.

## Public

| Method & path | Auth | Description |
|---|---|---|
| `GET /api/health` | none | `{ ok, scheduler, uptimeSeconds, time }`. No DB touch. Use for load-balancer checks. |
| `GET /api/arenas?q&status` | optional | Public directory. DRAFTs excluded server-side. `status` in `LIVE\|LOBBY\|ENDED`, else all three. Adds `joined` for signed-in users. Max 100 rows. |
| `GET /api/arenas/{code}/state` | optional | Full snapshot: public arena/round/price/leaderboard plus the private viewer block (balance, position, rank) when authed. `Cache-Control: no-store`. |
| `GET /api/arenas/{code}/candles?limit&interval` | none | Proxied Binance klines. `limit` clamped 10–300. `interval` allowlisted to `1m,3m,5m,15m,30m,1h`, else round-matched. Cached 5s. 503 when the feed is down. |
| `GET /api/arenas/{code}/results` | none for ENDED; participant/organizer otherwise | Settled rounds, leaderboard, personal trade history. |

## Authenticated

| Method & path | Description |
|---|---|
| `POST /api/arenas/{code}/join` | Join by code (rate-limited). Credits `startingBalance`. Idempotent only via the `alreadyJoined` gate on the page — double-POST is guarded by the unique constraint. |
| `POST /api/arenas/{code}/trade` | Body `{ side, stake? }` or `{ side, shares? }` (exactly one). Returns the fill or a truthful error: moved market, insufficient Arcs, closed round, over cap. |
| `GET /api/me` | Own profile summary. |
| `POST /api/auth/otp/request` | Body `{ email }`. Always 200 for well-formed addresses (existence hidden). Rate-limited per email and IP. |
| `POST /api/signup` | Body `{ name, email, password, wantsOrganizer? }`. 201 with the public user, 409 on duplicate, 422 on validation. Never returns the hash. Unhandled failures are 500 JSON (logged server-side with an error code, no PII). |

NextAuth (`/api/auth/[...nextauth]`): `credentials` (password), `email-otp`
(code redeem → find-or-create PARTICIPANT), `google` (only when env-configured;
verified emails link to same-email accounts).

## Organizer (role re-checked per route; foreign arenas 404)

| Method & path | Description |
|---|---|
| `GET/POST /api/admin/arenas` | List own arenas / create (validated: lock < round, stake ≤ balance, …). |
| `GET/PATCH/DELETE /api/admin/arenas/{id}` | Inspect, `start/pause/end/publish`, delete drafts. |
| `POST /api/admin/arenas/{id}/resolve` | Body `{ roundId, outcome: YES\|NO\|VOID, reason? }`. VOID refunds every fill. |

## Conventions

- Join codes: normalized uppercase, `[A-Z0-9]{4,12}`.
- Money: floats in Arcs; shares pay exactly 1.0 on win.
- Timestamps: ISO strings over HTTP; chart layer formats IST for display only.
- Rate limits (in-process, single instance): trades 25/min + 400ms gap,
  joins 12/min, signup 6/15min per IP, OTP 5/15min per email, arenas 20/hr
  per organizer.
