'use client';

/** Minimal geometric stroke icons — 24×24, currentColor. */

function Base({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function IconPlus({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M12 5v14M5 12h14" {...stroke} />
    </Base>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M3 20h18" {...stroke} />
      <path d="M6 16v-5M11 16V7M16 16v-8M21 16V4" {...stroke} />
    </Base>
  );
}

export function IconScreen({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <rect x="3" y="4" width="18" height="12" rx="2" {...stroke} />
      <path d="M9 20h6M12 16v4" {...stroke} />
    </Base>
  );
}

export function IconTrophy({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" {...stroke} />
      <path d="M7 6H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4M17 6h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4" {...stroke} />
    </Base>
  );
}

export function IconShield({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3Z" {...stroke} />
      <path d="M9.5 12l2 2 3.5-4" {...stroke} />
    </Base>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <circle cx="12" cy="12" r="8.5" {...stroke} />
      <path d="M12 7.5V12l3 2" {...stroke} />
    </Base>
  );
}

export function IconBolt({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M13 2 5 13.5h5L10.5 22 19 10h-5.5L13 2Z" {...stroke} strokeLinejoin="round" />
    </Base>
  );
}

export function IconArcs({ className }: { className?: string }) {
  return (
    <Base className={className}>
      <path d="M4 5.5 12 19l8-13.5" {...stroke} />
      <path d="M7.2 10.5h9.6" {...stroke} />
    </Base>
  );
}
