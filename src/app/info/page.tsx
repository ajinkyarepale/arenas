import type { Metadata } from 'next';
import Link from 'next/link';

import { Arcs } from '@/components/arcs-mark';
import { SiteShell } from '@/components/site-shell';
import { PageHeader, Panel } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About',
  description:
    'What Arenas is, how prediction markets price information, how the platform runs multiple independent college events, and why nothing here involves real money.',
};

export default function InfoPage() {
  return (
    <SiteShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow="About the platform"
          title="What Arenas is"
          subtitle="A multi-tenant platform for running live prediction market tournaments at college FinTech events."
        />

        <Section title="The problem it solves">
          <p>
            Explaining a market to a room is hard. Explaining it while a market is running,
            with everyone&apos;s Arcs on the line and a price moving on the projector, is
            almost easy. Arenas exists to make that second thing possible without a
            technical team.
          </p>
          <p>
            An organizer creates an arena, shares a join code, and starts the session.
            Everyone else opens a link on their phone. Twelve rounds later there is a
            leaderboard, and everyone in the room has watched a price discover itself in
            real time.
          </p>
        </Section>

        <Section title="How a prediction market prices information">
          <p>
            A prediction market turns a question into a tradeable contract. Here the
            contract is: <em>this candle closes above where it opened</em>. It pays{' '}
            <Arcs value={1} /> if true and nothing if false.
          </p>
          <p>
            If you would pay <Arcs value={0.62} /> for that contract, you are implicitly
            saying you think it is about 62% likely. So the price <em>is</em> the
            probability. When many people trade against each other, the price settles at
            the crowd&apos;s aggregate belief — and it updates the instant anyone changes
            their mind.
          </p>
          <p>
            That is the pedagogical payload of the whole event: prices are not decorations
            on top of information, they are how information gets aggregated.
          </p>
        </Section>

        <Section title="The market maker">
          <p>
            With thirty people in a room and a five-minute window, waiting for a buyer to
            match every seller does not work — most orders would simply never fill. Arenas
            uses an <Strong>automated market maker</Strong> instead, specifically Hanson&apos;s
            Logarithmic Market Scoring Rule (LMSR).
          </p>
          <p>
            It always quotes a price and always fills instantly. Its cost function is
          </p>
          <Formula>C(q) = b · ln( e^(qYes/b) + e^(qNo/b) )</Formula>
          <p>
            where <Mono>qYes</Mono> and <Mono>qNo</Mono> are the shares outstanding on each
            side. Any trade costs the difference in <Mono>C</Mono> before and after, and the
            instantaneous price of YES is
          </p>
          <Formula>p(YES) = e^(qYes/b) / ( e^(qYes/b) + e^(qNo/b) )</Formula>
          <p>
            which is always strictly between 0 and 1, so it reads directly as a probability.
          </p>
          <Panel className="p-5">
            <p className="text-sm font-semibold">What b does</p>
            <p className="mt-2 text-sm text-fg-muted">
              <Mono>b</Mono> is the liquidity parameter. High <Mono>b</Mono> means a deep
              market where trades barely move the price. Low <Mono>b</Mono> means every
              trade visibly shifts it — which is what makes a live event worth watching, so
              arenas default to a low value around 40.
            </p>
            <p className="mt-2 text-sm text-fg-muted">
              It also bounds the house: the market maker can subsidise at most{' '}
              <Mono>b · ln(2)</Mono> Arcs per round, no matter what traders do.
            </p>
          </Panel>
        </Section>

        <Section title="How rounds settle">
          <p>
            The price at the open is recorded as the strike. Trading locks a configurable
            buffer before the close so that nobody can trade against a result they can
            already see.
          </p>
          <p>
            The closing price is a short time-weighted average — several samples over a few
            seconds — never a single tick. A close strictly above the strike resolves YES;
            equal or below resolves NO. If the price feed cannot produce usable data, the
            round is declared VOID and every trade in it is refunded in full.
          </p>
          <p className="text-sm text-fg-faint">
            Price data comes from the Binance public REST API, proxied through the server so
            no participant&apos;s browser talks to a third party.
          </p>
        </Section>

        <Section title="Multiple colleges, one platform">
          <p>
            Every arena is a separate tenant. An organizer at one college creates an arena
            with its own asset, timing, starting Arc balance, liquidity setting and join
            code. Participants, rounds, trades and balances are all scoped to that
            arena&apos;s id and never cross between events.
          </p>
          <p>
            Several arenas can run simultaneously and independently — the round scheduler
            advances each one on its own clock.
          </p>
        </Section>

        <Section title="The join code">
          <p>
            A join code is a door, not a vault. It is drawn from an alphabet with no
            ambiguous characters (no 0/O, no 1/I/L), so it survives being read aloud and
            typed on a phone, and it is random rather than sequential so it cannot be
            guessed by counting upward.
          </p>
          <p>
            Join attempts are rate-limited, which is the practical defence. But the intended
            control is social: the organizer gives the code to the people in the room.
            Browsing the public calendar needs no code at all.
          </p>
        </Section>

        <Section title="No money. Anywhere.">
          <p>
            Arenas settles in Arcs — virtual credits with no cash value. There is no
            deposit, no withdrawal, no payment processing, no cash-out, and no mechanism
            by which Arcs become anything else.
          </p>
          <p>
            That is a deliberate design constraint rather than a feature gap: it keeps the
            platform an educational tool rather than a financial or gambling product, and it
            means a student society can run an event without a compliance conversation.
          </p>
          <p className="text-sm text-fg-faint">
            Nothing on this platform is investment advice, and none of the markets here are
            financial instruments.
          </p>
        </Section>

        <Panel className="p-7">
          <h2 className="text-lg font-bold">Run one at your college</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Create an organizer account, set up an arena, and share the code. The whole
            setup takes a few minutes.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/signup" className="btn-primary sm:w-52">
              Create an account
            </Link>
            <Link href="/guide" className="btn-secondary sm:w-52">
              Guide for traders
            </Link>
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">{title}</h2>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-fg-muted">
        {children}
      </div>
    </section>
  );
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-fg">{children}</strong>;
}

function Mono({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded border border-line bg-ink-900 px-1.5 py-0.5 font-mono text-[0.9em] text-fg">
      {children}
    </code>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border border-line bg-ink-900 px-5 py-4">
      <code className="whitespace-nowrap font-mono text-sm text-fg">{children}</code>
    </div>
  );
}
