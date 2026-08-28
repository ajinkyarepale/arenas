import Link from 'next/link';

import { cx } from '@/lib/format';

/** Small shared primitives. Deliberately plain — the app has its own look. */

export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('panel', className)} {...rest}>
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  LIVE: 'border-yes/50 bg-yes/10 text-yes shadow-[0_0_16px_-4px_rgba(0,232,150,0.5)]',
  LOBBY: 'border-accent/50 bg-accent/10 text-accent shadow-[0_0_16px_-4px_rgba(61,155,255,0.5)]',
  DRAFT: 'border-line-strong bg-ink-800 text-fg-muted',
  ENDED: 'border-line-strong bg-ink-800 text-fg-faint',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const label = status === 'LOBBY' ? 'OPEN' : status;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-[10.5px] font-semibold uppercase tracking-[0.1em]',
        STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT,
        className,
      )}
    >
      {status === 'LIVE' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yes opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-yes" />
        </span>
      )}
      {label}
    </span>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'yes' | 'no' | 'accent' | 'warn';
  className?: string;
}) {
  const tones = {
    neutral: 'border-line-strong bg-ink-800 text-fg-muted',
    yes: 'border-yes/40 bg-yes/10 text-yes',
    no: 'border-no/40 bg-no/10 text-no',
    accent: 'border-accent/40 bg-accent/10 text-accent',
    warn: 'border-warn/40 bg-warn/10 text-warn',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'yes' | 'no' | 'neutral';
  className?: string;
}) {
  return (
    <div
      className={cx(
        'panel-tight group relative overflow-hidden p-4 transition-colors hover:border-line-strong',
        className,
      )}
    >
      <div className="label">{label}</div>
      <div
        className={cx(
          'font-display tnum mt-1.5 text-2xl font-bold tracking-tight',
          tone === 'yes' && 'text-yes glow-yes',
          tone === 'no' && 'text-no glow-no',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-fg-faint">{hint}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="panel hud grid-field flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="font-display text-xl font-bold tracking-tight">{title}</h3>
      <p className="max-w-sm text-sm text-fg-muted">{body}</p>
      {action ? (
        <Link href={action.href} className="btn-primary mt-2">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-no/40 bg-no/10 px-3 py-2 text-sm text-no"
    >
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="relative flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <div className="label mb-2 flex items-center gap-2 !text-accent">
            <span className="inline-block h-px w-6 bg-accent/70" aria-hidden />
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-display text-balance text-4xl font-bold uppercase tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-3 max-w-2xl text-sm text-fg-muted sm:text-base">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent',
        className,
      )}
      aria-hidden
    />
  );
}

export * from './ui/beams-background';
export * from './ui/card-stack';
export * from './ui/slide-text-button';
export * from './ui/switch-button';
export * from './ui/kokonut-loader';

