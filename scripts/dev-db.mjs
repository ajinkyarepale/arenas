/**
 * A local Postgres for machines without Docker.
 *
 * Downloads and runs a real PostgreSQL server from `embedded-postgres`, storing
 * its data under .postgres/ in the project. This is a development convenience
 * only — in production, point DATABASE_URL at a managed Postgres and never run
 * this.
 *
 *   node scripts/dev-db.mjs start   # start (and initialise on first run)
 *   node scripts/dev-db.mjs stop    # stop
 *
 * Keep it running in one terminal, then `npm run dev` in another.
 */

import EmbeddedPostgres from 'embedded-postgres';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, '.postgres');

const CONFIG = {
  databaseDir: DATA_DIR,
  user: 'arenas',
  password: 'arenas',
  port: 5432,
  persistent: true,
};

const command = process.argv[2] ?? 'start';

async function start() {
  const firstRun = !existsSync(DATA_DIR);
  if (firstRun) mkdirSync(DATA_DIR, { recursive: true });

  const pg = new EmbeddedPostgres(CONFIG);

  if (firstRun) {
    console.log('[db] initialising a new cluster (first run downloads Postgres)…');
    await pg.initialise();
  }

  await pg.start();

  if (firstRun) {
    console.log('[db] creating database "arenas"…');
    await pg.createDatabase('arenas');
  }

  console.log('\n  Postgres is running.');
  console.log(`  DATABASE_URL="postgresql://arenas:arenas@127.0.0.1:5432/arenas?schema=public"`);
  console.log('\n  Leave this running. In another terminal:');
  console.log('    npm run db:push');
  console.log('    npm run db:seed');
  console.log('    npm run dev\n');
  console.log('  Ctrl-C to stop.\n');

  const shutdown = async () => {
    console.log('\n[db] stopping…');
    try {
      await pg.stop();
    } catch {
      // Already gone.
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Hold the process open.
  setInterval(() => {}, 1 << 30);
}

async function stop() {
  const pg = new EmbeddedPostgres(CONFIG);
  await pg.stop();
  console.log('[db] stopped');
}

if (command === 'stop') {
  await stop();
} else {
  await start();
}
