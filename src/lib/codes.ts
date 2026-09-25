import { randomInt } from 'node:crypto';

/**
 * Join codes are read aloud, typed on phones, and written on a whiteboard, so
 * the alphabet drops everything that gets confused in a hurry: 0/O, 1/I/L,
 * 5/S, 2/Z, 8/B. What remains is 26 unambiguous characters.
 *
 * At 6 characters that is 26^6 ~= 3.1e8 possibilities. Not a secret — the real
 * control is "only the people in the room get the code" — but far too sparse to
 * stumble onto by typing guesses, especially behind the join rate limiter.
 */
const ALPHABET = 'ACDEFGHJKMNPQRTUVWXY34679';
const CODE_LENGTH = 6;

export function generateJoinCode(length = CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** Codes are stored and compared uppercase; users may type them any way. */
export function normaliseJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export function isValidJoinCodeShape(code: string): boolean {
  return /^[A-Z0-9]{4,12}$/.test(normaliseJoinCode(code));
}

/**
 * Generate a code that is not already taken. Collisions are vanishingly rare
 * but a unique index would still throw, so we retry a few times before
 * widening the code.
 */
export async function generateUniqueJoinCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const length = attempt < 5 ? CODE_LENGTH : CODE_LENGTH + 2;
    const code = generateJoinCode(length);
    if (!(await exists(code))) return code;
  }
  throw new Error('Could not allocate an unused join code');
}
