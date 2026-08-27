import { randomInt } from 'node:crypto';

/**
 * Join codes are read aloud, typed on phones, and written on a whiteboard, so
 * the alphabet drops everything that gets confused in a hurry: 0/O, 1/I/L,
 * 5/S, 2/Z, 8/B. What remains is 26 unambiguous characters.
 *
 * Generated in the clean short format: AR-XXXX (e.g. AR-7K4P).
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
const RANDOM_PART_LENGTH = 4;

export function generateJoinCode(length = RANDOM_PART_LENGTH): string {
  let out = 'AR-';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Codes are stored and compared uppercase; users may type them with or without hyphens. */
export function normaliseJoinCode(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[\s]/g, '');
  return cleaned;
}

export function isValidJoinCodeShape(code: string): boolean {
  const normalised = normaliseJoinCode(code).replace(/-/g, '');
  return /^[A-Z0-9]{3,12}$/.test(normalised);
}

/**
 * Generate a code that is not already taken.
 */
export async function generateUniqueJoinCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const length = attempt < 6 ? RANDOM_PART_LENGTH : RANDOM_PART_LENGTH + 1;
    const code = generateJoinCode(length);
    if (!(await exists(code))) return code;
  }
  throw new Error('Could not allocate an unused join code');
}
