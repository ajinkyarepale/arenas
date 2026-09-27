/**
 * Minimal structured logging — one JSON object per line.
 *
 * `console.log` strings got us through development, but a production incident
 * (like the blind signup-500 debug) needs greppable fields. Levels follow the
 * usual ordering; LOG_LEVEL selects the floor (default: info, test: silent).
 *
 * Swap the sink for a real shipper later without touching call sites.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function floor(): number {
  if (process.env.VITEST) return ORDER.error + 1; // silent under test
  const raw = (process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return ORDER[raw as Level] ?? ORDER.info;
}

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (ORDER[level] < floor()) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...fields,
  });
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit('debug', msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit('info', msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit('warn', msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit('error', msg, fields),
};
