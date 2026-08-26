/** Display helpers. Every number a participant reads goes through one of these. */

export function formatPoints(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSignedPoints(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatPoints(Math.abs(value), decimals)}`;
}

/** Implied probability as a percentage, e.g. 0.6234 -> "62.3%". */
export function formatProbability(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/** Asset price. Crypto spans several orders of magnitude, so scale precision. */
export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const decimals = value >= 1000 ? 2 : value >= 1 ? 4 : 6;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatShares(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Countdown format: mm:ss, or h:mm:ss past an hour. */
export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

/** "5 min", "90 sec" — for describing a round length in prose. */
export function formatDuration(seconds: number): string {
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return `${minutes} min`;
  }
  return `${seconds} sec`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const target = new Date(iso).getTime();
  const deltaSec = Math.round((target - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (abs < 60) return rtf.format(deltaSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(deltaSec / 3600), 'hour');
  return rtf.format(Math.round(deltaSec / 86400), 'day');
}

export function formatPercent(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function ordinal(n: number): string {
  const suffix =
    n % 100 >= 11 && n % 100 <= 13
      ? 'th'
      : n % 10 === 1
        ? 'st'
        : n % 10 === 2
          ? 'nd'
          : n % 10 === 3
            ? 'rd'
            : 'th';
  return `${n}${suffix}`;
}

/** Tiny classname joiner — enough for this app, no need for a dependency. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
