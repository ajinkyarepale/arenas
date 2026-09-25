'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Arcs } from '@/components/arcs-mark';
import { ErrorNote, Panel, Spinner } from '@/components/ui';
import { quoteByBudget, maxSubsidy } from '@/lib/lmsr';
import { cx, formatProbability } from '@/lib/format';

/**
 * Arena setup.
 *
 * The liquidity parameter is the one setting organizers have no intuition for,
 * so instead of explaining it we show it: the preview says what a 50-point trade
 * would do to the price at the chosen `b`. That is the number that decides
 * whether the big screen is exciting or inert.
 */

interface FormState {
  name: string;
  description: string;
  hostName: string;
  asset: string;
  roundDurationSec: number;
  lockBufferSec: number;
  totalRounds: number;
  startingBalance: number;
  liquidityParamB: number;
  maxStakePerTrade: number;
  code: string;
  scheduledFor: string;
}

const DEFAULTS: FormState = {
  name: '',
  description: '',
  hostName: '',
  asset: 'BTCUSDT',
  roundDurationSec: 300,
  lockBufferSec: 30,
  totalRounds: 12,
  startingBalance: 1000,
  liquidityParamB: 40,
  maxStakePerTrade: 250,
  code: '',
  scheduledFor: '',
};

const ROUND_PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '15 min', seconds: 900 },
];

export function CreateArenaForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  // What a 50-point trade does to a fresh book at this liquidity.
  const impact = useMemo(() => {
    try {
      const quote = quoteByBudget({ qYes: 0, qNo: 0 }, 'YES', 50, form.liquidityParamB);
      return {
        from: quote.priceBefore,
        to: quote.priceAfter,
        delta: quote.priceAfter - quote.priceBefore,
        subsidy: maxSubsidy(form.liquidityParamB),
      };
    } catch {
      return null;
    }
  }, [form.liquidityParamB]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFields({});

    try {
      const res = await fetch('/api/admin/arenas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...form,
          description: form.description || undefined,
          hostName: form.hostName || undefined,
          code: form.code ? form.code.toUpperCase() : undefined,
          scheduledFor: form.scheduledFor
            ? new Date(form.scheduledFor).toISOString()
            : undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(body.error ?? 'Could not create that arena.');
        setFields(body.fields ?? {});
        return;
      }

      router.push(`/admin/arenas/${body.arena.id}`);
      router.refresh();
    } catch {
      setError('Network problem — please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Panel className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold">The event</h2>

        <Field label="Arena name" error={fields.name}>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="field"
            placeholder="FinTech Society Trading Night"
          />
        </Field>

        <Field label="Host" hint="Shown on the public calendar and the big screen.">
          <input
            value={form.hostName}
            onChange={(e) => set('hostName', e.target.value)}
            className="field"
            placeholder="Your college or club"
          />
        </Field>

        <Field label="Description" hint="Optional. One or two lines.">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="field min-h-[80px] resize-y"
            maxLength={400}
            placeholder="Open to all years. Prizes for the top three."
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scheduled start" hint="Optional — you still start it manually.">
            <input
              type="datetime-local"
              value={form.scheduledFor}
              onChange={(e) => set('scheduledFor', e.target.value)}
              className="field"
            />
          </Field>

          <Field
            label="Join code"
            hint="Leave blank and we generate an unambiguous one."
            error={fields.code}
          >
            <input
              value={form.code}
              onChange={(e) => set('code', e.target.value.toUpperCase())}
              className="field font-mono tracking-widest"
              maxLength={12}
              placeholder="Auto"
            />
          </Field>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold">Format</h2>

        <Field
          label="Asset"
          hint="Any Binance spot symbol. Checked when you create the arena."
          error={fields.asset}
        >
          <input
            required
            value={form.asset}
            onChange={(e) => set('asset', e.target.value.toUpperCase())}
            className="field font-mono"
            placeholder="BTCUSDT"
          />
        </Field>

        <Field label="Round length" error={fields.roundDurationSec}>
          <div className="flex flex-wrap gap-2">
            {ROUND_PRESETS.map((preset) => (
              <button
                key={preset.seconds}
                type="button"
                onClick={() => set('roundDurationSec', preset.seconds)}
                className={cx(
                  'btn !min-h-[40px] border px-4 text-sm',
                  form.roundDurationSec === preset.seconds
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-line-strong bg-ink-800 text-fg-muted',
                )}
              >
                {preset.label}
              </button>
            ))}
            <input
              type="number"
              min={60}
              max={3600}
              value={form.roundDurationSec}
              onChange={(e) => set('roundDurationSec', Number(e.target.value))}
              className="field tnum w-28"
              aria-label="Round length in seconds"
            />
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Lock buffer (seconds)"
            hint="Trading stops this long before the close, so the closing price cannot be traded against."
            error={fields.lockBufferSec}
          >
            <input
              type="number"
              min={5}
              max={600}
              required
              value={form.lockBufferSec}
              onChange={(e) => set('lockBufferSec', Number(e.target.value))}
              className="field tnum"
            />
          </Field>

          <Field label="Total rounds" error={fields.totalRounds}>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={form.totalRounds}
              onChange={(e) => set('totalRounds', Number(e.target.value))}
              className="field tnum"
            />
          </Field>
        </div>

        <p className="text-xs text-fg-faint">
          Estimated event length:{' '}
          <span className="tnum font-semibold text-fg-muted">
            {Math.round((form.roundDurationSec * form.totalRounds) / 60)} minutes
          </span>{' '}
          of continuous play.
        </p>
      </Panel>

      <Panel className="flex flex-col gap-4 p-5">
        <h2 className="text-sm font-semibold">Points and pricing</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starting balance" error={fields.startingBalance}>
            <input
              type="number"
              min={1}
              required
              value={form.startingBalance}
              onChange={(e) => set('startingBalance', Number(e.target.value))}
              className="field tnum"
            />
          </Field>

          <Field
            label="Max stake per trade"
            hint="Stops one person moving the whole book in a single tap."
            error={fields.maxStakePerTrade}
          >
            <input
              type="number"
              min={1}
              required
              value={form.maxStakePerTrade}
              onChange={(e) => set('maxStakePerTrade', Number(e.target.value))}
              className="field tnum"
            />
          </Field>
        </div>

        <Field
          label={`Liquidity parameter b = ${form.liquidityParamB}`}
          error={fields.liquidityParamB}
        >
          <input
            type="range"
            min={10}
            max={200}
            step={5}
            value={form.liquidityParamB}
            onChange={(e) => set('liquidityParamB', Number(e.target.value))}
            className="h-11 w-full accent-accent"
          />
        </Field>

        {impact ? (
          <div className="rounded border border-line bg-ink-900 p-4">
            <p className="text-sm text-fg-muted">
              At <span className="tnum font-semibold text-fg">b = {form.liquidityParamB}</span>,
              a 50-point YES trade on a fresh market moves the price from{' '}
              <span className="tnum font-semibold text-fg">
                {formatProbability(impact.from)}
              </span>{' '}
              to{' '}
              <span className="tnum font-semibold text-yes">
                {formatProbability(impact.to)}
              </span>
              .
            </p>
            <p className="mt-2 text-xs text-fg-faint">
              {impact.delta > 0.18
                ? 'Very reactive — great for a room watching a projector, but the price will swing hard.'
                : impact.delta > 0.07
                  ? 'A good live-event setting: trades visibly move the market without whipsawing it.'
                  : 'Deep and stable — the price will barely move, which reads as boring on a big screen.'}{' '}
              The house subsidises at most <Arcs value={impact.subsidy} decimals={0} /> per round.
            </p>
          </div>
        ) : null}
      </Panel>

      <ErrorNote>{error}</ErrorNote>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending ? <Spinner /> : null}
          {pending ? 'Creating…' : 'Create arena'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary sm:w-40"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="label">{label}</span>
      {children}
      {hint ? <span className="text-xs text-fg-faint">{hint}</span> : null}
      {error ? <span className="text-xs text-no">{error}</span> : null}
    </label>
  );
}
