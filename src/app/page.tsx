import type { Metadata } from 'next';
import Link from 'next/link';

import { FieldBackdrop } from '@/components/field-backdrop';
import { LiveArenasTicker } from '@/components/live-arenas-ticker';
import { SiteShell } from '@/components/site-shell';
import { Panel } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Arenas — live prediction markets for campus FinTech events',
  description:
    'Run a live Yes/No prediction market tournament at your college. Participants trade virtual points on whether the next candle closes green, priced by an automated market maker, on a big screen everyone can watch.',
};

export default function LandingPage() {
  return (
    <SiteShell width="wide" className="!py-0">
      {/* Hero */}
      <section className="scanlines relative -mx-4 overflow-hidden px-4 py-20 sm:-mx-6 sm:px-6 sm:py-28">
        {/* Layered backdrop: grid ground plane, radial bloom, live particle field. */}
        <div className="grid-field pointer-events-none absolute inset-0 opacity-70" aria-hidden />
        <div
          className="bloom pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[52rem] -translate-x-1/2 -translate-y-1/3"
          aria-hidden
        />
        <FieldBackdrop className="opacity-80" />
        {/* Fade the field out at the bottom so it never fights the content below. */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent"
          aria-hidden
        />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded border border-accent/30 bg-accent/[0.07] px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-accent">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yes opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yes" />
            </span>
            Live rooms · not homework
          </div>

          <h1 className="font-display mt-7 max-w-4xl text-balance text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            A trading floor
            <br />
            <span className="text-accent glow-accent">in an afternoon</span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-fg-muted">
            Arenas turns a lecture hall into a live prediction market. Everyone gets virtual
            points and one question every five minutes:{' '}
            <span className="font-semibold text-fg">does this candle close green?</span>{' '}
            Prices move as the room trades, the projector shows it happening, and the
            leaderboard changes on every settle.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary text-base sm:w-56">
              Get started
            </Link>
            <Link href="/markets" className="btn-secondary text-base sm:w-56">
              See upcoming events
            </Link>
          </div>

          <p className="mt-6 font-mono text-xs uppercase tracking-[0.1em] text-fg-faint">
            Free · virtual points only · no deposits, nothing to withdraw
          </p>
        </div>
      </section>

      <LiveArenasTicker />

      {/* How a round works */}
      <section className="border-t border-line py-16">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          One round, start to finish
        </h2>
        <p className="mt-3 max-w-2xl text-fg-muted">
          The format is called <span className="font-semibold text-fg">5-Min Candle</span>.
          It repeats for as many rounds as the organizer sets, usually twelve.
        </p>

        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'The bell',
              body: 'A new round opens. The asset price at that instant becomes the strike everyone is betting against, and the market resets to 50/50.',
            },
            {
              step: '02',
              title: 'The room trades',
              body: 'Buy YES if you think it closes above the strike, NO if below. Every trade moves the price, so the number on the screen is the room’s live consensus.',
            },
            {
              step: '03',
              title: 'Lock',
              body: 'Trading stops shortly before the close, so nobody can trade on a result they can already see coming.',
            },
            {
              step: '04',
              title: 'Settle',
              body: 'The close is sampled over several seconds and averaged. Winning shares pay 1 point each, the leaderboard updates, and the next round opens.',
            },
          ].map((item) => (
            <li key={item.step}>
              <Panel className="hud group h-full p-5 transition-colors hover:border-accent/40">
                <div className="flex items-center gap-2">
                  <span className="font-mono tnum text-xs font-bold tracking-[0.2em] text-accent">
                    {item.step}
                  </span>
                  <span className="h-px flex-1 bg-gradient-to-r from-accent/50 to-transparent" />
                </div>
                <h3 className="font-display mt-3 text-lg font-bold uppercase tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-fg-muted">{item.body}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      {/* Two audiences */}
      <section className="border-t border-line py-16">
        <div className="grid gap-5 lg:grid-cols-2">
          <Panel className="p-7">
            <div className="label">For participants</div>
            <h3 className="font-display mt-2 text-2xl font-bold uppercase tracking-tight">
              It works on the phone in your hand
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm text-fg-muted">
              {[
                'Two big buttons, a stake slider, and a countdown — nothing to learn mid-round.',
                'Live implied probability, so you can see what everyone else thinks before you commit.',
                'Lock your phone, come back, and the screen is correct again immediately.',
                'Add it to your home screen for one-tap access during the event.',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-yes" />
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/guide" className="btn-secondary mt-6 text-sm">
              Read the 3-minute guide
            </Link>
          </Panel>

          <Panel className="p-7">
            <div className="label">For organizers</div>
            <h3 className="font-display mt-2 text-2xl font-bold uppercase tracking-tight">
              Your event, your code, your room
            </h3>
            <ul className="mt-5 flex flex-col gap-3 text-sm text-fg-muted">
              {[
                'Spin up an arena in a minute: asset, round length, number of rounds, starting points.',
                'Share one join code. Only people with it can enter your arena.',
                'A projector view built to be read from the back of the room.',
                'Start, pause, and force-resolve a round if the price feed ever fails.',
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {line}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn-secondary mt-6 text-sm">
              Run an event
            </Link>
          </Panel>
        </div>
      </section>

      {/* Closing */}
      <section className="border-t border-line py-16 pb-24">
        <Panel className="hud grid-field scanlines relative overflow-hidden p-8 sm:p-12">
          <div
            className="bloom pointer-events-none absolute left-1/2 top-1/2 h-96 w-[40rem] -translate-x-1/2 -translate-y-1/2"
            aria-hidden
          />
          <div className="relative">
            <h2 className="font-display max-w-2xl text-balance text-3xl font-bold uppercase tracking-tight sm:text-4xl">
              Anyone can host.
              <br />
              <span className="text-accent glow-accent">Every arena is independent.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-fg-muted">
              Arenas is multi-tenant by design. Any society at any college can run its own
              event on the same platform, with its own code, its own timing, its own
              participants — and no visibility into anyone else&apos;s.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="btn-primary sm:w-48">
                Create an account
              </Link>
              <Link href="/info" className="btn-secondary sm:w-48">
                How it works
              </Link>
            </div>
          </div>
        </Panel>
      </section>
    </SiteShell>
  );
}
