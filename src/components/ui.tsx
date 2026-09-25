import Link from 'next/link';

import { cx } from '@/lib/format';

/** Shared primitives — restrained dark surfaces, hairline borders. */

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
  LIVE: 'border-yes/30 bg-yes/10 text-yes',
  LOBBY: 'border-accent/30 bg-accent/10 text-accent-light',
  DRAFT: 'border-line-strong bg-ink-800 text-fg-muted',
  ENDED: 'border-line bg-ink-850 text-fg-faint',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const label = status === 'LOBBY' ? 'OPEN' : status;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em]',
        STATUS_STYLES[status] ?? STATUS_STYLES.DRAFT,
        className,
      )}
    >
      {status === 'LIVE' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yes" aria-hidden />}
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
    yes: 'border-yes/30 bg-yes/10 text-yes',
    no: 'border-no/30 bg-no/10 text-no',
    accent: 'border-accent/30 bg-accent/10 text-accent-light',
    warn: 'border-warn/30 bg-warn/10 text-warn',
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
    <div className={cx('panel-tight p-4', className)}>
      <div className="label">{label}</div>
      <div
        className={cx(
          'tnum mt-1.5 text-2xl font-bold tracking-tight text-fg',
          tone === 'yes' && 'text-yes',
          tone === 'no' && 'text-no',
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
    <div className="panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-xl font-bold tracking-tight text-fg">{title}</h3>
      <p className="max-w-sm text-sm leading-relaxed text-fg-muted">{body}</p>
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
    <p role="alert" className="rounded-lg border border-no/30 bg-no/10 px-3 py-2 text-sm text-no">
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
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <div className="label mb-2 !text-accent-light">{eyebrow}</div> : null}
        <h1 className="text-balance text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
          {title}
        </h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted sm:text-[15px]">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
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

/** Editorial section heading: kicker + title + lede. */
export function SectionHeading({
  kicker,
  title,
  lede,
  align = 'left',
}: {
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <div className={cx('flex items-center gap-2', align === 'center' && 'justify-center')}>
        <span className="inline-block h-px w-6 bg-accent/70" aria-hidden />
        <span className="label !text-accent-light">{kicker}</span>
      </div>
      <h2 className="mt-3 text-balance text-2xl font-extrabold tracking-tight text-fg sm:text-[32px] sm:leading-[1.15]">
        {title}
      </h2>
      {lede ? <p className="mt-3 leading-relaxed text-fg-muted">{lede}</p> : null}
    </div>
  );
}
