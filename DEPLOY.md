# Deploying Arenas

Arenas needs a **persistent Node process that never sleeps**. The custom server
hosts Next.js, the Socket.io layer and the round scheduler together, and the
scheduler has to keep advancing rounds even when nobody has the page open. That
rules out serverless (Vercel, Netlify, Cloudflare Workers) and makes any
"sleeps after 15 minutes" free tier a real problem, not a cosmetic one — an
arena left unattended on a sleeping instance stalls mid-event.

## Picking a host

| Platform | Free? | Sleeps? | Card? | Verdict |
| --- | --- | --- | --- | --- |
| **Northflank** | Yes — 2 services, 1 DB, 2 cron jobs | **No** | No | **Recommended.** The only genuinely free always-on option |
| Fly.io | No — free tier ended late 2024 | No | Yes | ~$2–4/mo. Solid, but no longer free |
| Render | Yes | **Yes**, 15 min idle | No | Scheduler stops while asleep |
| Koyeb | Yes | **Yes**, 1 hr idle, can't disable | No | Same problem |
| Railway | No — $5 one-time credit | No | Yes | Fine for one event, then paid |
| Vercel / Netlify | Yes | N/A | No | **Won't work** — serverless, no websockets or scheduler |

Northflank's free tier is officially a "Developer Sandbox" and their docs say
it is not intended for production. For a college event that is fine. If this
becomes something you run regularly for real audiences, move to Fly.io or a
cheap VPS.

This guide covers **Supabase (database) + Northflank (app)** as the main path,
with Fly.io and Render as appendices. Everything except the deploy step is
identical between them.

```
Supabase (Postgres)  ──▶  Northflank service (Next + Socket.io + scheduler)
```

> Northflank's free tier includes one database, so you could skip Supabase.
> I'd still use Supabase: you get a proper Table Editor for watching trades and
> balances live during an event, and it keeps your one free Northflank
> database spare.

---

## 1. Database — Supabase

1. Go to <https://supabase.com> → **New project**.
2. Pick a name, a region close to your event, and a **strong database password**.
   Save that password now; it is only shown once.
3. Wait about two minutes for provisioning.
4. Open **Connect** (top bar) → **Connection string** → **Session pooler**.

Copy that URI. It looks like:

```
postgresql://postgres.abcdefghijkl:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

Replace `[YOUR-PASSWORD]` with the password from step 2, then append the SSL flag:

```
postgresql://postgres.abcdefghijkl:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
```

> **Use the Session pooler (port 5432), not the Transaction pooler (6543) and
> not the direct connection.** The direct host is IPv6-only unless you pay for
> the IPv4 add-on, and the transaction pooler cannot run Prisma migrations.
> The session pooler works for both, and this app is a single process with a
> small connection pool, so pooling limits are not a concern.

If your password contains `@ : / ? # [ ] %`, URL-encode it (`@` → `%40`).

---

## 2. Generate your auth secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep that value — it is `NEXTAUTH_SECRET`. Never commit it.

---

## 3. Push the code to GitHub

```bash
git init && git add . && git commit -m "Arenas: initial commit"
```

`.gitignore` already excludes `.env`, `node_modules`, `.next` and the local
`.postgres` data directory. Verify nothing secret is staged:

```bash
git status
```

Create an empty repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/arenas.git && git branch -M main && git push -u origin main
```

---

## 4. App — Northflank

Sign up at <https://northflank.com> with GitHub. No card required for the free
Developer Sandbox.

### 4.1 Create the service

1. **Create new** → **Service** → **Combined service**
   *(combined = build from your repo and run it, which is what you want)*
2. **Repository**: link your GitHub account and pick the `arenas` repo, branch `main`.
3. **Build**:
   - Build type: **Dockerfile**
   - Dockerfile path: `/Dockerfile`
   - Build context: `/`
4. **Resources**: the smallest free plan is fine to start. If the service
   restarts under load, raise the memory — see troubleshooting.
5. **Networking**: expose port **3000**, protocol **HTTP**, and enable
   **public access**. Northflank gives you a `*.code.run` URL.
6. **Health check**: path `/api/health` on port 3000. It touches no database
   and reports whether the round scheduler is alive in that process.
7. **Instances**: set to **1**.

> **One instance, always.** The scheduler, the per-arena trade mutex and the
> rate limiter all live in-process. Two instances would run two schedulers
> against the same arenas and split the rate limits. Scaling out would need a
> database advisory lock per arena and Redis-backed limits.

Create the service. The first build takes 3–6 minutes.

### 4.2 Set the environment variables

In the service → **Environment** → add these as **secrets**:

```
DATABASE_URL      postgresql://postgres.abcdefghijkl:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
NEXTAUTH_SECRET   the-random-string-from-step-2
NEXTAUTH_URL      https://YOUR-SERVICE.code.run
```

Optional — sign-in upgrades (leave all four unset to keep email+password only):

```
GOOGLE_CLIENT_ID      xxx.apps.googleusercontent.com   # enables "Continue with Google"
GOOGLE_CLIENT_SECRET  xxx
RESEND_API_KEY        re_xxx                           # delivers OTP emails via Resend
EMAIL_FROM            Arenas <no-reply@yourdomain.com> # must be a verified Resend sender
```

`NEXTAUTH_URL` must match the URL people actually visit, including `https://`
and with **no trailing slash**. Getting this wrong is the single most common
cause of sign-in redirect loops. You will only know the real URL after the
first deploy, so set it then and let the service redeploy.

`PORT`, `HOSTNAME` and `NODE_ENV` are already baked into the Dockerfile.

### 4.3 Create the tables

Once the build succeeds, open the service → **Shell** and run:

```bash
npx prisma migrate deploy
```

This creates all nine tables in Supabase from `prisma/migrations/` (base schema, liquidity bots, email-code auth).

> Optional: set this as a **pre-deploy command** in the service's build
> settings (`npx prisma migrate deploy`) so future migrations apply
> automatically on every deploy.

### 4.4 Seed the demo accounts

Still in the Shell:

```bash
npm run db:seed
```

This creates the organizer account, eight participants, and the `DEMO24` /
`RECAP7` demo arenas.

**Change the demo password immediately if the site is public** — the seeded
password (`arenas-demo-2024`) is in this repo. Either set
`SEED_ORGANIZER_PASSWORD` as a secret before seeding, or sign up a fresh
organizer account and delete the demo one.

### 4.5 Optional: Google sign-in and email-code login

Both are live in the code and gated by environment variables — no code changes.

**Google** (5 minutes):

1. <https://console.cloud.google.com/apis/credentials> → **Create Credentials → OAuth client ID** → type **Web application**.
2. Under **Authorized redirect URIs** add exactly:
   `https://YOUR-SERVICE.code.run/api/auth/callback/google`
3. Copy the client ID and secret into the service's secrets as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and redeploy.
4. The "Continue with Google" button appears on `/signin` and `/signup`. Google-verified emails link to an existing same-email account automatically; brand-new users arrive as PARTICIPANTs with no password (password login stays impossible for them).

**Email codes** (10 minutes):

1. <https://resend.com> → sign up, **Domains** → verify your sending domain (add the DNS records), then **API Keys** → create one.
2. Set `RESEND_API_KEY` and `EMAIL_FROM="Arenas <no-reply@yourdomain.com>"` (the address must belong to the verified domain) and redeploy.
3. `/signin` → **Email code** tab: users get a 6-digit code, valid 10 minutes, dead after 5 wrong guesses. Unknown addresses create an account on first redeem.

---

## 5. Verify

Open your `*.code.run` URL and check:

- [ ] Home page loads
- [ ] `/signin` works with the seeded organizer account
- [ ] `/arenas/DEMO24` shows the arena
- [ ] `/arenas/DEMO24/screen` loads with no login and the price updates live
      *(this is the real websocket test — if the number moves, Socket.io is up)*
- [ ] `/admin` is reachable as the organizer, and redirects a participant away
- [ ] Open it on a phone and place a trade
- [ ] If Google is enabled: the Google button appears on `/signin` and a Google login lands on `/dashboard`
- [ ] If Resend is enabled: requesting an email code delivers a real email within a minute

Watch the service's **Logs** tab for `[scheduler] running` on boot, then prices
arriving each second.

---

## Changing the frontend after deployment

Yes — the design is fully editable after launch. Nothing about deploying
freezes it, and your database is untouched by a redeploy.

```bash
npm run dev
```

Edit, check it at `http://localhost:3000`, then ship:

```bash
git add . && git commit -m "New arena colours" && git push
```

Northflank rebuilds automatically on push to `main`. Live in about three
minutes. (On Fly.io, run `fly deploy` instead.)

Where the visuals live:

| What | File |
| --- | --- |
| Colour tokens, fonts, global styles | `src/app/globals.css` |
| Tailwind theme (colours, spacing) | `tailwind.config.ts` |
| Shared UI primitives (Panel, Stat, Badge) | `src/components/ui.tsx` |
| Page frame, nav, footer | `src/components/site-shell.tsx` |
| Trading screen layout | `src/components/arena/live-arena.tsx` |
| Buy buttons, stake chips | `src/components/arena/trade-panel.tsx` |
| Projector view | `src/components/arena/` |
| PWA icons | `npm run icons` after editing `scripts/generate-icons.mjs` |

Pure styling changes are safe to ship mid-event. Changes to
`prisma/schema.prisma` are not — those need a migration:

```bash
npx prisma migrate dev --name describe_your_change
```

Commit the generated `prisma/migrations/` folder and push. If you set the
pre-deploy command in 4.3 it applies on deploy; otherwise run
`npx prisma migrate deploy` from the Shell.

---

## Operating it

The scheduler is stateless — it reads the current round from the database every
tick, so a restart mid-event recovers on its own with no lost rounds.

Watch your data in Supabase's **Table Editor** during an event to see
participants, trades and balances live.

---

## Troubleshooting

**Sign-in redirects in a loop** — `NEXTAUTH_URL` does not exactly match the
site's URL. Check for a trailing slash, or `http` where it should be `https`.

**`Can't reach database server`** — you used the direct connection host
(`db.xxx.supabase.co`) instead of the session pooler
(`aws-0-*.pooler.supabase.com:5432`). The direct host is IPv6-only on the free
plan.

**`migrate deploy` fails** — the password in `DATABASE_URL` is wrong or
contains unencoded special characters. Test it locally with
`npx prisma migrate status`.

**Prices never update / probability frozen** — Binance's API is blocked in some
regions (notably the US for `api.binance.com`). Change region, or set
`BINANCE_REST_BASE=https://data-api.binance.vision` as an environment variable.

**Websocket never connects** — check the logs that the service is actually up,
and that the exposed port is 3000 over HTTP. The client must load the site over
`https`, not a raw IP.

**Service restarts under a crowd (OOM)** — raise the memory allocation. Next.js
plus Socket.io wants roughly 512 MB; 256 MB will boot but can die under a room
of users. On Northflank this may push you past the free plan.

**Google button missing** — both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
must be set; the button hides when either is absent. After setting them, add the
redirect URI `https://YOUR-SERVICE.code.run/api/auth/callback/google` in the
Google Cloud console (**APIs & Services → Credentials → OAuth client**), or
Google rejects the login with `redirect_uri_mismatch`.

**Email codes never arrive** — without `RESEND_API_KEY` the code is only printed
to the service logs (look for `[otp]`). That is the local-dev fallback, not a
production mailer. Set `RESEND_API_KEY` plus a verified `EMAIL_FROM` sender and
redeploy; Resend's dashboard shows delivery per message.

---

## Appendix A: Fly.io

Not free — the free allowance ended for new organizations in late 2024, so
expect a card and roughly $2–4/month for an always-on `shared-cpu-1x` 512 MB
machine. `fly.toml` in this repo is already configured for it, including
`auto_stop_machines = false` so the machine never sleeps.

Install flyctl:

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

```bash
curl -L https://fly.io/install.sh | sh
```

Then, from the project root:

```bash
fly auth signup
```

```bash
fly launch --no-deploy --copy-config --name arenas-YOURNAME --region iad
```

Answer **No** to "set up a Postgres database?" (Supabase is the database) and
No to Redis/Sentry. Regions: `iad` US-East, `lhr` London, `bom` Mumbai,
`sin` Singapore, `fra` Frankfurt.

```bash
fly secrets set DATABASE_URL="postgresql://..." NEXTAUTH_SECRET="..." NEXTAUTH_URL="https://arenas-YOURNAME.fly.dev"
```

```bash
fly deploy
```

```bash
fly scale count 1
```

The release step runs `npx prisma migrate deploy` automatically. Then seed:

```bash
fly ssh console -C "npm run db:seed"
```

Useful commands:

| Command | What it does |
| --- | --- |
| `fly logs` | Live logs — scheduler ticks, prices, errors |
| `fly ssh console` | Shell into the running machine |
| `fly status` | Machine health and count |
| `fly scale memory 1024` | More RAM if you see OOM restarts |
| `fly secrets set KEY="value"` | Update a secret (triggers a redeploy) |

---

## Appendix B: Render, and how to deal with the 15-minute idle

### What the free instance type cannot do

Three limits shape the whole process, so know them up front:

- **No shell / SSH access.** You cannot open a terminal on the running service.
- **No pre-deploy commands.** Those are a paid feature.
- **No one-off jobs.**

So there is no way to run `prisma migrate deploy` or `npm run db:seed` *on
Render*. You run both **from your own machine**, pointed at the Supabase
connection string. Supabase is reachable from anywhere, so this works fine —
and it is what most people do anyway.

### Setup

`render.yaml` in this repo configures the service for you.

1. <https://render.com> → **New** → **Blueprint** → connect your GitHub repo.
2. Render reads `render.yaml` and proposes one free Docker web service named
   `arenas`, with `/api/health` as the health check.
3. It will prompt for the three secrets:
   - `DATABASE_URL` — your Supabase session-pooler URI with `?sslmode=require`
   - `NEXTAUTH_SECRET` — the random string from step 2
   - `NEXTAUTH_URL` — leave a placeholder for now; you do not know the URL yet
4. **Apply**. The first Docker build takes 5–10 minutes.
5. When it finishes, copy the real service URL (`https://arenas-xxxx.onrender.com`),
   set `NEXTAUTH_URL` to exactly that in **Environment**, and save. The service
   redeploys. **No trailing slash, `https` not `http`** — a mismatch here causes
   a sign-in redirect loop.

> Prefer clicking through it yourself? **New → Web Service**, pick the repo,
> set Runtime **Docker**, Instance type **Free**, Health check path
> `/api/health`, and add the same three environment variables.

### Create the tables and seed — from your machine

The first deploy will boot but every page that touches the database will error,
because Supabase is still empty. Fix that locally.

**PowerShell:**

```powershell
$env:DATABASE_URL="postgresql://postgres.abcdefghijkl:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

**bash:**

```bash
export DATABASE_URL="postgresql://postgres.abcdefghijkl:YOURPASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
```

Then, in that same terminal:

```bash
npx prisma migrate deploy
```

```bash
npm run db:seed
```

Confirm it landed by opening the **Table Editor** in Supabase — you should see
eight tables and the `DEMO24` / `RECAP7` arenas.

**Close that terminal when you are done**, so you do not later run a local
command against your production database by accident.

Every future schema change follows the same pattern: `npx prisma migrate dev`
locally to create the migration, commit it, push (Render redeploys), then run
`npx prisma migrate deploy` against Supabase from your machine.

### The rule

A free web service spins down after **15 minutes with no inbound traffic**, and
spinning back up takes **about a minute**. What matters here is Render's exact
definition of traffic: HTTP requests **and WebSocket messages from existing
connections** both count.

Why it matters more for this app than most: while the service is down, the
**round scheduler is not running**. Rounds do not open, lock, resolve or settle.
Participants do not just see a slow page — the event stops. Nothing is
corrupted (the scheduler is stateless and recovers from the database on the next
boot), but the clock everyone is watching has stopped.

### Fix 1 — keep one tab open (free, no third party, recommended)

Because existing WebSocket messages count as traffic, **one open browser tab is
enough**. The projector view holds a Socket.io connection that exchanges a
heartbeat every 20 seconds, which is well inside the 15-minute window:

```
https://YOUR-APP.onrender.com/arenas/DEMO24/screen
```

That page needs no login, so you can leave it open anywhere — the projector
laptop, a spare tab, an old phone on a charger. As long as it is open, the
service never idles. This is the cleanest option and you were going to have the
big screen open during the event anyway.

Open it a couple of minutes before the session starts so the first spin-up
happens before anyone is watching.

### Fix 2 — an external uptime pinger

For unattended uptime, hit the health endpoint on a schedule:

```
https://YOUR-APP.onrender.com/api/health
```

It returns quickly, touches no database, and reports whether the scheduler is
alive:

```json
{ "ok": true, "scheduler": "running", "uptimeSeconds": 27, "time": "..." }
```

Use a free scheduler such as <https://cron-job.org> or <https://uptimerobot.com>
with a **10-minute** interval (`*/10 * * * *`) — comfortably inside the
15-minute window with room for a missed run.

**Read this before you set that up:**

- **You get 750 free instance hours per workspace per month. A calendar month
  is about 730 hours.** Pinging one service around the clock therefore *just*
  fits, with roughly 20 hours of headroom — and only if that is the **only**
  free web service in your entire Render workspace. Delete any other free
  services first.
- **If you exhaust the 750 hours, Render suspends every free web service in the
  workspace until the 1st of next month.** That is a much worse failure than a
  cold start, and it is not recoverable by waiting an hour.
- **Do not host the pinger on Render.** A second free service burns the same
  hour budget you are trying to protect. Use an outside service.
- Render does not officially support keeping a free instance awake this way.
  It works today; treat it as a convenience, not a guarantee.

If you want genuine unattended always-on, that is exactly what Northflank's
free tier gives you without any of this — see the main guide above.

### Fix 3 — pay

Render's cheapest paid instance does not spin down at all. Around $7/month,
more than Fly.io for the same outcome.

### What does *not* work

- **Adding a `setInterval` inside the app that calls itself.** Outbound requests
  the service makes to itself are not inbound traffic, and a suspended process
  cannot run a timer to wake itself up.
- **Assuming participants' phones keep it alive.** iOS suspends websockets when
  the screen locks or the tab is backgrounded. A room full of pocketed phones
  generates no traffic. Keep a real tab open on a machine that stays awake.
