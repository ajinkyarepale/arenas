import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Arcs } from '@/components/arcs-mark';
import { JoinArena } from '@/components/arena/join-arena';
import { SiteShell } from '@/components/site-shell';
import { Panel, StatusPill } from '@/components/ui';
import { auth } from '@/lib/auth';
import { findArenaByCode, toPublicInfo } from '@/lib/engine/snapshot';
import { formatDateTime, formatDuration } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { joinCodeSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) return { title: 'Arena' };
  const arena = await findArenaByCode(parsed.data);
  return { title: arena ? arena.name : 'Arena' };
}

export default async function ArenaJoinPage({ params }: { params: { code: string } }) {
  const parsed = joinCodeSchema.safeParse(params.code);
  if (!parsed.success) notFound();

  const arena = await findArenaByCode(parsed.data);
  if (!arena) notFound();

  const session = await auth();
  const info = toPublicInfo(arena);

  const participant = session?.user?.id
    ? await prisma.eventParticipant.findUnique({
        where: { eventId_userId: { eventId: arena.id, userId: session.user.id } },
        select: { id: true, balance: true },
      })
    : null;

  return (
    <SiteShell width="narrow">
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/markets" className="text-sm text-fg-muted hover:text-fg">
            ← All markets
          </Link>
        </div>

        <Panel className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="label">{info.hostName ?? info.organizerName}</div>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
                {info.name}
              </h1>
            </div>
            <StatusPill status={info.status} />
          </div>

          {info.description ? (
            <p className="mt-4 text-sm leading-relaxed text-fg-muted">{info.description}</p>
          ) : null}

          <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
            <Detail label="Format" value="5-Min Candle" />
            <Detail label="Asset" value={info.asset} />
            <Detail label="Rounds" value={String(info.totalRounds)} />
            <Detail label="Round length" value={formatDuration(info.roundDurationSec)} />
            <Detail
              label="Trading locks"
              value={`${info.lockBufferSec}s before close`}
            />
            <div>
              <dt className="label">Starting Arcs</dt>
              <dd className="mt-1 text-sm font-semibold text-fg">
                <Arcs value={info.startingBalance} decimals={0} />
              </dd>
            </div>
            <Detail label="Starts" value={formatDateTime(info.scheduledFor)} />
            <Detail label="Traders joined" value={String(info.participantCount)} />
            <Detail label="Join code" value={info.code} mono />
          </dl>
        </Panel>

        <JoinArena
          code={info.code}
          name={info.name}
          status={info.status}
          alreadyJoined={participant !== null}
          balance={participant?.balance ?? null}
          startingBalance={info.startingBalance}
          signedIn={Boolean(session?.user?.id)}
        />

        <Panel className="p-5">
          <h2 className="text-sm font-semibold">First time trading a market?</h2>
          <p className="mt-2 text-sm text-fg-muted">
            The guide covers what YES and NO actually mean, how the price moves, and how
            you win or lose Arcs. It takes about three minutes and means nothing has to
            be explained in the room.
          </p>
          <Link href="/guide" className="btn-secondary mt-4 text-sm">
            Read the guide
          </Link>
        </Panel>
      </div>
    </SiteShell>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd
        className={
          mono
            ? 'mt-1 font-mono text-base font-bold tracking-[0.2em] text-accent-light'
            : 'mt-1 text-sm font-semibold text-fg'
        }
      >
        {value}
      </dd>
    </div>
  );
}
