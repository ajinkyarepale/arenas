import { z } from 'zod';

/**
 * Every API route validates its input here. Nothing reaches Prisma or the
 * market engine until it has been through one of these schemas, so bad ranges
 * (negative stakes, 10,000-round arenas, a lock buffer longer than the round)
 * are rejected at the edge rather than corrupting an arena mid-event.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(3)
  .max(254)
  .email('Enter a valid email address')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(200, 'That password is too long');

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Enter your name')
    .max(60, 'That name is too long'),
  email: emailSchema,
  password: passwordSchema,
  // Organizer accounts are self-serve so a club can run its own arena, but the
  // role is still enforced server-side on every admin route.
  wantsOrganizer: z.boolean().optional().default(false),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const joinCodeSchema = z
  .string()
  .trim()
  .min(4, 'Join codes are at least 4 characters')
  .max(12, 'That does not look like a join code')
  .transform((value) => value.toUpperCase().replace(/[\s-]/g, ''))
  .refine((value) => /^[A-Z0-9]+$/.test(value), 'Join codes are letters and numbers only');

export const joinArenaSchema = z.object({
  code: joinCodeSchema,
});

export const sideSchema = z.enum(['YES', 'NO']);

/**
 * A trade is denominated one of two ways, never both:
 *
 *   `stake`  — "spend this many points", shares derived by inverting the cost
 *              function. What the quick-stake chips send.
 *   `shares` — "buy exactly this many shares", cost derived from the cost
 *              function. What the shares tab sends, where the participant is
 *              targeting a payout rather than a budget.
 */
export const placeTradeSchema = z
  .object({
    side: sideSchema,
    stake: z
      .number({ invalid_type_error: 'Enter a stake amount' })
      .finite('Enter a stake amount')
      .positive('Stake must be greater than zero')
      .max(100_000, 'That stake is far too large')
      .optional(),
    shares: z
      .number({ invalid_type_error: 'Enter a number of shares' })
      .finite('Enter a number of shares')
      .positive('Shares must be greater than zero')
      .max(1_000_000, 'That is far too many shares')
      .optional(),
  })
  .refine((value) => (value.stake === undefined) !== (value.shares === undefined), {
    message: 'Send either a stake in points or a number of shares, not both.',
    path: ['stake'],
  });
export type PlaceTradeInput = z.infer<typeof placeTradeSchema>;

const TICKER = /^[A-Z0-9]{5,20}$/;

export const createArenaSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'Give the arena a name')
      .max(80, 'That name is too long'),
    description: z.string().trim().max(400).optional().or(z.literal('')),
    hostName: z.string().trim().max(80).optional().or(z.literal('')),
    asset: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .refine((value) => TICKER.test(value), 'Use a Binance symbol such as BTCUSDT'),
    roundDurationSec: z
      .number()
      .int('Round duration must be a whole number of seconds')
      .min(60, 'Rounds must run at least 60 seconds')
      .max(3600, 'Rounds cannot run longer than an hour'),
    lockBufferSec: z
      .number()
      .int()
      .min(5, 'Allow at least 5 seconds to sample the closing price')
      .max(600),
    totalRounds: z
      .number()
      .int()
      .min(1, 'An arena needs at least one round')
      .max(100, 'That is more rounds than any event needs'),
    startingBalance: z
      .number()
      .positive('Starting balance must be positive')
      .max(1_000_000),
    liquidityParamB: z
      .number()
      .positive('Liquidity must be positive')
      .min(1, 'Very low liquidity makes the price jump wildly')
      .max(10_000),
    maxStakePerTrade: z
      .number()
      .positive('Maximum stake must be positive')
      .max(1_000_000),
    code: joinCodeSchema.optional(),
    scheduledFor: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.lockBufferSec < data.roundDurationSec, {
    message: 'The lock buffer must be shorter than the round itself',
    path: ['lockBufferSec'],
  })
  .refine((data) => data.maxStakePerTrade <= data.startingBalance, {
    message: 'Maximum stake cannot exceed the starting balance',
    path: ['maxStakePerTrade'],
  });
export type CreateArenaInput = z.infer<typeof createArenaSchema>;

export const updateArenaSchema = z.object({
  action: z.enum(['start', 'pause', 'end', 'publish']),
});

export const forceResolveSchema = z.object({
  roundId: z.string().optional(),
  resolveArena: z.boolean().optional(),
  outcome: z.enum(['YES', 'NO', 'VOID']),
  reason: z.string().trim().max(200).optional(),
});

/** Turn a ZodError into the flat shape the client forms expect. */
export function formatZodError(error: z.ZodError): {
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!fields[key]) fields[key] = issue.message;
  }
  return {
    message: error.issues[0]?.message ?? 'Those details are not valid',
    fields,
  };
}
