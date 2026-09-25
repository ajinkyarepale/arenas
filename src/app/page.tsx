import type { Metadata } from 'next';
import Link from 'next/link';

import { ArenaDirectory } from '@/components/arena-directory';
import { FeaturedArena } from '@/components/featured-arena';
import { FieldBackdrop } from '@/components/field-backdrop';
import {
  IconBolt,
  IconClock,
  IconPlus,
  IconScreen,
  IconShield,
  IconTrophy,
} from '@/components/icons';
import { LiveArenasTicker } from '@/components/live-arenas-ticker';
import { Reveal } from '@/components/reveal';
import { SiteShell } from '@/components/site-shell';
import { Panel, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Arenas — where opinions become markets',
  description:
    'Create prediction markets, take YES/NO positions with Arcs virtual credits, and see what the crowd thinks will happen — live 5-minute candle tournaments for campus FinTech events.',
};

export default function LandingPage() {
  return (
    <SiteShell width="wide" className="!py-0">
      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-1 pb-14 pt-14 sm:pt-20">
        <FieldBackdrop className="opacity-60" />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink-950"
          aria-hidden
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-ink-900 py-1.5 pl-2.5 pr-3.5 text-xs font-semibold text-fg-muted">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yes opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-yes" />
              </span>
              Live prediction markets for campus events
            </div>

            <h1 className="mt-6 max-w-2xl text-balance text-6xl font-extrabold leading-[0.98] tracking-tight text-fg sm:text-7xl xl:text-[86px]">
              Where opinions become{' '}
              <span className="bg-gradient-to-r from-accent-light via-accent to-yes bg-clip-text text-transparent">
                markets.
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-fg-muted">
              Create prediction markets, take positions on outcomes, and see what
              the crowd thinks will happen — one five-minute candle at a time.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/markets" className="btn-primary text-[15px] sm:w-56">
                Explore Arenas
              </Link>
              <Link href="/signup" className="btn-secondary text-[15px] sm:w-56">
                Create an Arena
              </Link>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-4 border-t border-line pt-6">
              {[
                ['01 · Join', 'One code, no setup'],
                ['02 · Trade', 'YES or NO, staked in Arcs'],
                ['03 · Settle', 'Winners paid every round'],
              ].map(([term, detail]) => (
                <div key={term}>
                  <dt className="font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-accent-light">{term}</dt>
                  <dd className="mt-1 text-[13px] font-medium leading-snug text-fg-muted">{detail}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal delay={120}>
            <FeaturedArena />
            <p className="mt-2 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint">
              Real market data from the platform
            </p>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <LiveArenasTicker />
      </Reveal>

      {/* ── 2. How Arenas works ─────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            kicker="How it works"
            title="From question to settled market in three moves"
            lede="Every arena runs the same tight loop: a room, a candle, and a price that is the room's live consensus."
          />
        </Reveal>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'Discover',
              body: 'Browse open arenas across host colleges. Check the asset, round length, starting Arcs, and who is already in — then enter with the organizer’s join code.',
              meta: 'No signup to browse',
            },
            {
              n: '02',
              title: 'Take a position',
              body: 'Back YES if the candle closes above its open, NO if below. Every fill reprices the market instantly, so the number on screen is what everyone, together, believes.',
              meta: 'Priced by an LMSR market maker',
            },
            {
              n: '03',
              title: 'Follow the outcome',
              body: 'Trading locks before the close, the settle price is averaged over several samples, winners earn 1 Arc per share — and the next round opens seconds later.',
              meta: 'Leaderboard updates every round',
            },
          ].map((s, i) => (
            <li key={s.n}>
              <Reveal delay={i * 100} className="h-full">
              <Panel className="group relative h-full overflow-hidden p-6">
                <span
                  className="pointer-events-none absolute -right-2 -top-5 select-none font-mono text-[88px] font-extrabold leading-none text-fg/5 transition-colors group-hover:text-accent/10"
                  aria-hidden
                >
                  {s.n}
                </span>
                <div className="font-mono text-xs font-bold tracking-[0.18em] text-accent">{s.n}</div>
                <h3 className="mt-2 text-xl font-extrabold tracking-tight text-fg">{s.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{s.body}</p>
                <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-faint">
                  {s.meta}
                </p>
              </Panel>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ── 3. The contract ─────────────────────────────────── */}
      <section className="py-4 sm:py-6">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-line bg-ink-900">
            <div className="grid-field pointer-events-none h-24 opacity-50" aria-hidden />
            <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['01', 'One question', 'Does this candle close above its open? YES or NO — every round, same question.'],
                ['02', 'ARC 1 or zero', 'A winning share pays exactly ARC 1. A losing share pays nothing. No margin, no liquidation.'],
                ['03', 'Paid up front', 'Both sides stake before the close, so every payout is pre-funded by the market itself.'],
                ['04', 'Settled in minutes', 'Lock, averaged close, instant leaderboard. Then the next round opens.'],
              ].map(([n, title, body], i) => (
                <div key={n} className="bg-ink-900 p-6 transition-colors hover:bg-ink-850">
                  <div className="font-mono text-xs font-bold tracking-[0.18em] text-accent">{n}</div>
                  <h3 className="mt-2 text-[15px] font-extrabold tracking-tight text-fg">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── 4. Live arenas (real data) ────────────────────────── */}
      <section className="border-t border-line py-16 sm:py-20">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeading
              kicker="Live now"
              title="Open arenas on the floor"
              lede="Real tournaments running on the platform right now. Anyone can browse — a join code gets you into the room."
            />
            <Link href="/markets" className="btn-secondary shrink-0 text-sm">
              All markets →
            </Link>
          </div>
        </Reveal>
        <Reveal delay={100} className="mt-8">
          <ArenaDirectory compact />
        </Reveal>
      </section>

      {/* ── 5. Capabilities ─────────────────────────────────── */}
      <section className="border-t border-line py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            kicker="Capabilities"
            title="Everything a market needs, nothing it doesn't"
            lede="Built for a lecture hall with two hundred phones — and for the organizer running it alone."
          />
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            [IconPlus, 'Create in a minute', 'Asset, round length, rounds, starting Arcs, liquidity. Your arena gets its own join code instantly.', '/signup'],
            [IconBolt, 'Trade YES / NO', 'Stake Arcs or size in shares. Live probability, instant fills, an order summary before you commit.', '/guide'],
            [IconScreen, 'Projector screen', 'A login-free big-screen view: probability, countdown, candles, leaderboard — readable from the back row.', '/markets'],
            [IconTrophy, 'Leaderboards that move', 'Rankings recompute on every settle. Rank deltas show who climbed and who slipped.', '/markets'],
            [IconShield, 'Organizer controls', 'Start, pause, force-resolve, or void a round if the price feed fails. Voids refund every fill.', '/admin'],
            [IconClock, 'Results & history', 'Every round archived with open, close, outcome, and your personal P&L per trade.', '/dashboard'],
          ].map(([IconCmp, title, body, href], i) => {
            const CapIcon = IconCmp as React.ComponentType<{ className?: string }>;
            return (
              <Reveal key={title as string} delay={(i % 3) * 90}>
                <Link href={href as string} className="panel group block h-full p-6 transition-colors hover:border-line-strong">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink-950 text-accent-light transition-colors group-hover:border-accent/40 group-hover:text-accent">
                    <CapIcon />
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold text-fg transition-colors group-hover:text-accent-light">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{body as string}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── 5. Create walkthrough ───────────────────────────── */}
      <section className="border-t border-line py-16 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Reveal>
            <SectionHeading
              kicker="For organizers"
              title="Publish your arena in five steps"
              lede="Drafts stay invisible until you open them. The moment an arena goes LOBBY, it appears on the public calendar with its own join code."
            />
            <Link href="/signup" className="btn-primary mt-7 text-sm">
              Run your first event
            </Link>
          </Reveal>

          <ol className="flex flex-col">
            {[
              ['Write the setup', 'Name it, describe the event, pick the asset — usually BTC or ETH.'],
              ['Fix the question', 'Every round asks the same binary question: does the candle close above its open? YES or NO.'],
              ['Configure the clock', 'Round length, number of rounds, lock buffer, starting Arcs, and market liquidity.'],
              ['Share the code', 'Hand one join code to the room. Only people with it can enter — DRAFT arenas never appear publicly.'],
              ['Open and run', 'Press start. Rounds open, lock, settle, and advance on their own; the projector follows along.'],
            ].map(([title, body], i) => (
              <li key={title}>
                <Reveal delay={i * 70}>
                <div className="row-line flex gap-4 py-4">
                  <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink-800 font-mono text-[13px] font-bold text-accent-light">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold text-fg">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-fg-muted">{body}</p>
                  </div>
                </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 6. Access model ─────────────────────────────────── */}
      <section className="border-t border-line py-16 sm:py-20">
        <Reveal>
          <SectionHeading
            kicker="Access"
            title="Public to browse, coded to enter"
            lede="The calendar is open: anyone can see what's scheduled and read the guide. Entering a room takes the organizer's join code — and participation is enforced on the server, not just hidden in the UI."
          />
        </Reveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Reveal>
            <Panel className="h-full p-6">
              <div className="label !text-yes">Open to everyone</div>
              <h3 className="mt-2 text-lg font-extrabold tracking-tight text-fg">Browse, learn, watch the screen</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm leading-relaxed text-fg-muted">
                <li>· Public arena calendar with status, schedule, and size</li>
                <li>· The 3-minute trading guide</li>
                <li>· Login-free projector view for the room</li>
              </ul>
            </Panel>
          </Reveal>
          <Reveal delay={100}>
            <Panel className="h-full p-6">
              <div className="label !text-accent-light">With a join code</div>
              <h3 className="mt-2 text-lg font-extrabold tracking-tight text-fg">Trade, climb, settle</h3>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm leading-relaxed text-fg-muted">
                <li>· Join the arena and receive starting Arcs</li>
                <li>· Buy YES/NO shares every round</li>
                <li>· Personal portfolio, P&L, and round history</li>
              </ul>
            </Panel>
          </Reveal>
        </div>
      </section>

      {/* ── 7. Final CTA ────────────────────────────────────── */}
      <section className="border-t border-line py-16 sm:py-24">
        <Reveal>
          <Panel className="relative overflow-hidden px-8 py-12 text-center sm:px-12 sm:py-16">
            <div className="grid-field pointer-events-none absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <h2 className="mx-auto max-w-xl text-balance text-3xl font-extrabold tracking-tight text-fg sm:text-5xl">
                Have a view on what happens next?
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-fg-muted">
                Explore the markets, take a position, or create your own arena.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/markets" className="btn-primary sm:w-52">
                  Explore Arenas
                </Link>
                <Link href="/signup" className="btn-secondary sm:w-52">
                  Create your first Arena
                </Link>
              </div>
            </div>
          </Panel>
        </Reveal>
      </section>
    </SiteShell>
  );
}
