import type { Metadata } from 'next';
import Link from 'next/link';

import { Arcs, ArcsSigned } from '@/components/arcs-mark';
import { SiteShell } from '@/components/site-shell';
import { Panel, PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How to trade',
  description:
    'Everything a first-time trader needs before an Arenas event: what YES and NO mean, how the price moves, how you win Arcs, and what to do in your first round.',
};

/**
 * The onboarding surface.
 *
 * Written so an organizer can send this link the day before and explain nothing
 * in the room. It answers, in order, the questions people actually ask in the
 * first ninety seconds of their first round.
 */
export default function GuidePage() {
  return (
    <SiteShell>
      <div className="flex flex-col gap-10">
        <PageHeader
          eyebrow="Read this before your first round"
          title="How to trade a candle market"
          subtitle="Three minutes now saves you the first two rounds of confusion. No finance background needed."
        />

        <Section title="The question you are answering">
          <p>
            A round opens and the platform writes down the current price of the asset — say
            Bitcoin at <Mono>$64,210</Mono>. That number is the{' '}
            <Strong>strike</Strong>, and it does not change for the rest of the round.
          </p>
          <p>
            Five minutes later the round closes. There is exactly one question:{' '}
            <Strong>is the price higher than it was at the open?</Strong>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Callout tone="yes" title="YES">
              The closing price is <em>strictly above</em> the strike. Even a cent above
              counts.
            </Callout>
            <Callout tone="no" title="NO">
              The closing price is at or below the strike. A perfectly flat close resolves
              NO — a tie is not a win for YES.
            </Callout>
          </div>
        </Section>

        <Section title="What you are actually buying">
          <p>
            You are buying <Strong>shares</Strong> with <Strong>Arcs</Strong>, the
            platform&apos;s virtual credits. A share is a claim that pays{' '}
            <Strong><Arcs value={1} /></Strong> if your side wins, and nothing if it
            loses. That is the whole contract.
          </p>
          <p>
            So the price of a share is always somewhere between <Arcs value={0} /> and{' '}
            <Arcs value={1} />, and it is usually written as a percentage. If YES costs{' '}
            <Mono>62%</Mono>, you pay <Arcs value={0.62} /> for something that pays{' '}
            <Arcs value={1} /> if the candle closes green.
          </p>
          <Panel className="p-5">
            <p className="text-sm font-semibold">A worked example</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-fg-muted">
              <li>You stake <Mono><Arcs value={50} decimals={0} /></Mono> on YES while YES is trading at 62%.</li>
              <li>That buys you roughly <Mono>78 shares</Mono> (50 ÷ 0.62 ≈ 78).</li>
              <li>
                The candle closes green. Your 78 shares pay <Arcs value={1} /> each:{' '}
                <span className="font-semibold text-yes"><ArcsSigned value={78} decimals={0} /></span>,
                for a profit of <Arcs value={28} decimals={0} />.
              </li>
              <li>
                The candle closes red instead. The shares pay nothing:{' '}
                <span className="font-semibold text-no"><ArcsSigned value={-50} decimals={0} /></span>.
              </li>
            </ul>
          </Panel>
          <p className="text-sm text-fg-faint">
            The cheaper your side is when you buy, the more shares your stake buys, and the
            more you win if you are right. That is the entire risk-reward trade-off.
          </p>
        </Section>

        <Section title="Why the price keeps moving">
          <p>
            There is no order book and no waiting for someone to take the other side. An{' '}
            <Strong>automated market maker</Strong> always quotes a price and always fills
            you instantly.
          </p>
          <p>
            The rule it follows is simple: buying YES pushes the YES price up, buying NO
            pushes it down. So the number on the screen is not an opinion from the
            platform — it is a live readout of what the room collectively believes, updated
            on every trade.
          </p>
          <Panel className="p-5">
            <p className="text-sm font-semibold">Two consequences worth knowing</p>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-fg-muted">
              <li>
                <Strong>Big trades get worse prices.</Strong> The price moves as your own
                order fills, so a large stake pays a higher average price than the number
                you saw before tapping. The screen shows you the estimate first.
              </li>
              <li>
                <Strong>Being early pays.</Strong> If you think the crowd is wrong, the
                time to act is before they arrive — you get the cheap price and they push it
                toward you.
              </li>
            </ul>
          </Panel>
        </Section>

        <Section title="Reading the live price">
          <p>
            The big percentage is the market&apos;s implied probability that this candle
            closes green. Treat it as a running score:
          </p>
          <ul className="flex flex-col gap-2">
            <Bullet>
              <Mono>50%</Mono> — genuinely undecided. This is where every round starts.
            </Bullet>
            <Bullet>
              <Mono>75%</Mono> — the room is fairly confident it closes up. YES shares are
              expensive; NO shares are cheap and pay well if the crowd is wrong.
            </Bullet>
            <Bullet>
              <Mono>10%</Mono> — near consensus that it closes down. Buying YES here is a
              long shot with a large payoff.
            </Bullet>
          </ul>
          <p className="text-sm text-fg-faint">
            The chart underneath shows the actual asset. The dashed blue line on it is this
            round&apos;s strike — above the line is a YES, at or below is a NO.
          </p>
        </Section>

        <Section title="The clock">
          <p>
            Trading does <Strong>not</Strong> stay open until the last second. It locks a
            short buffer before the close — typically thirty seconds — so nobody can trade
            on a result that is already visible.
          </p>
          <p>
            After the lock, the platform samples the price several times over a few seconds
            and averages them. That average is the close. Sampling rather than taking one
            tick is deliberate: a single stray print should never decide a round.
          </p>
          <p className="text-sm text-fg-faint">
            If the price feed fails entirely, the round is declared VOID and every trade in
            it is refunded in full. You are never settled against a made-up number.
          </p>
        </Section>

        <Section title="Your first round: what to actually do">
          <ol className="flex flex-col gap-3">
            {[
              'Do not trade in the first thirty seconds. Watch the price move and get a feel for it.',
              'Stake small to start — ARC 10 or ARC 25. You have twelve rounds; there is no prize for going all-in on round one.',
              'Pick a side for a reason you could say out loud. "It has been climbing all round" is a reason. "I feel lucky" is not.',
              'Check the countdown before you tap. If it is under thirty seconds, you may already be locked out.',
              'After the round settles, look at what the price did versus what happened. That feedback loop is the entire point of the exercise.',
            ].map((line, index) => (
              <li key={line} className="flex gap-3 text-sm">
                <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-800 text-xs font-bold text-accent">
                  {index + 1}
                </span>
                <span className="text-fg-muted">{line}</span>
              </li>
            ))}
          </ol>
        </Section>

        <Section title="Mistakes people make every single event">
          <div className="grid gap-3 sm:grid-cols-2">
            <Callout tone="warn" title="Going all-in on round one">
              Bust early and you spend eleven rounds watching. Size your stakes so you can
              be wrong three times.
            </Callout>
            <Callout tone="warn" title="Chasing the crowd at 90%">
              At 90% you risk <Arcs value={0.9} /> to win <Arcs value={0.1} />. The crowd
              being right nine times out of ten is exactly break-even.
            </Callout>
            <Callout tone="warn" title="Tapping at 3 seconds left">
              Trading is already locked. Your tap does nothing and you miss the round.
            </Callout>
            <Callout tone="warn" title="Forgetting a tie loses">
              A flat close resolves NO. In a quiet market that matters more than you would
              think.
            </Callout>
          </div>
        </Section>

        <Panel className="p-7">
          <h2 className="text-lg font-bold">That is everything</h2>
          <p className="mt-2 text-sm text-fg-muted">
            You now know more than you need for your first event. Get your join code from
            whoever is running it, and you are set.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link href="/markets" className="btn-primary sm:w-52">
              Find your event
            </Link>
            <Link href="/info" className="btn-secondary sm:w-52">
              How the platform works
            </Link>
          </div>
        </Panel>

        <p className="text-xs leading-relaxed text-fg-faint">
          Arenas is educational. Every market settles in Arcs — virtual credits with no
          cash value. There is nothing to deposit or withdraw, and nothing here is
          investment advice.
        </p>
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
      <span>{children}</span>
    </li>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'yes' | 'no' | 'warn';
  title: string;
  children: React.ReactNode;
}) {
  const tones = {
    yes: 'border-yes/40 bg-yes/8',
    no: 'border-no/40 bg-no/8',
    warn: 'border-warn/40 bg-warn/8',
  };
  const titleTones = { yes: 'text-yes', no: 'text-no', warn: 'text-warn' };

  return (
    <div className={`rounded border p-4 ${tones[tone]}`}>
      <div className={`text-sm font-bold ${titleTones[tone]}`}>{title}</div>
      <p className="mt-1.5 text-sm text-fg-muted">{children}</p>
    </div>
  );
}
