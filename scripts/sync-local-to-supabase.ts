/**
 * Sync Local PostgreSQL Database to Supabase PostgreSQL Database
 *
 * Usage:
 *   npx tsx scripts/sync-local-to-supabase.ts "<YOUR_SUPABASE_POSTGRES_URL>"
 *
 * Example:
 *   npx tsx scripts/sync-local-to-supabase.ts "postgresql://postgres.xxx:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
 */

import { PrismaClient } from '../src/generated/client';

const localUrl =
  process.env.LOCAL_DATABASE_URL ||
  'postgresql://arenas:arenas@127.0.0.1:5432/arenas?schema=public';

const targetUrl = process.argv[2] || process.env.SUPABASE_DATABASE_URL;

if (!targetUrl) {
  console.error('\x1b[31mError: Please provide your Supabase Database URL as an argument or in SUPABASE_DATABASE_URL.\x1b[0m');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/sync-local-to-supabase.ts "<SUPABASE_DATABASE_URL>"');
  console.log('\nExample:');
  console.log('  npx tsx scripts/sync-local-to-supabase.ts "postgresql://postgres.yourproject:yourpassword@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"\n');
  process.exit(1);
}

const localDb = new PrismaClient({
  datasources: { db: { url: localUrl } },
});

const targetDb = new PrismaClient({
  datasources: { db: { url: targetUrl } },
});

async function sync() {
  console.log('\x1b[36mConnecting to local database and Supabase...\x1b[0m');

  // 1. Sync Users
  const users = await localDb.user.findMany();
  console.log(`Found ${users.length} user(s) locally. Syncing to Supabase...`);
  for (const user of users) {
    await targetDb.user.upsert({
      where: { id: user.id },
      create: user,
      update: user,
    });
  }
  console.log('\x1b[32m✓ Users synced.\x1b[0m');

  // 2. Sync Events
  const events = await localDb.event.findMany();
  console.log(`Found ${events.length} event(s)/arena(s) locally. Syncing to Supabase...`);
  for (const event of events) {
    await targetDb.event.upsert({
      where: { id: event.id },
      create: event,
      update: event,
    });
  }
  console.log('\x1b[32m✓ Events synced.\x1b[0m');

  // 3. Sync Rounds
  const rounds = await localDb.round.findMany();
  console.log(`Found ${rounds.length} round(s) locally. Syncing to Supabase...`);
  for (const round of rounds) {
    await targetDb.round.upsert({
      where: { id: round.id },
      create: round,
      update: round,
    });
  }
  console.log('\x1b[32m✓ Rounds synced.\x1b[0m');

  // 4. Sync Event Participants
  const participants = await localDb.eventParticipant.findMany();
  console.log(`Found ${participants.length} participant(s) locally. Syncing to Supabase...`);
  for (const participant of participants) {
    await targetDb.eventParticipant.upsert({
      where: { id: participant.id },
      create: participant,
      update: participant,
    });
  }
  console.log('\x1b[32m✓ Participants synced.\x1b[0m');

  // 5. Sync Trades
  const trades = await localDb.trade.findMany();
  console.log(`Found ${trades.length} trade(s) locally. Syncing to Supabase...`);
  for (const trade of trades) {
    await targetDb.trade.upsert({
      where: { id: trade.id },
      create: trade,
      update: trade,
    });
  }
  console.log('\x1b[32m✓ Trades synced.\x1b[0m');

  // 6. Sync Organizer Requests
  const requests = await localDb.organizerRequest.findMany();
  console.log(`Found ${requests.length} organizer request(s) locally. Syncing to Supabase...`);
  for (const req of requests) {
    await targetDb.organizerRequest.upsert({
      where: { id: req.id },
      create: req,
      update: req,
    });
  }
  console.log('\x1b[32m✓ Organizer requests synced.\x1b[0m');

  console.log('\n\x1b[32m========================================================\x1b[0m');
  console.log('\x1b[32m  Database sync to Supabase completed successfully!     \x1b[0m');
  console.log('\x1b[32m========================================================\x1b[0m\n');
}

sync()
  .catch((err) => {
    console.error('\x1b[31mSync failed:\x1b[0m', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await localDb.$disconnect();
    await targetDb.$disconnect();
  });
