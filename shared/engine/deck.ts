import { RANKS, SUITS, type Card } from './types.js'

/** Returns an integer in [0, maxExclusive). Injectable so tests can be deterministic. */
export type RandomInt = (maxExclusive: number) => number

/** Cryptographically secure random integer using rejection sampling (no modulo bias). */
export const secureRandomInt: RandomInt = (maxExclusive) => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 2 ** 32) {
    throw new RangeError(
      `maxExclusive must be an integer in [1, 2^32], got ${maxExclusive}`,
    )
  }
  const limit = 2 ** 32 - (2 ** 32 % maxExclusive)
  const buf = new Uint32Array(1)
  let value: number
  do {
    globalThis.crypto.getRandomValues(buf)
    value = buf[0]!
  } while (value >= limit)
  return value % maxExclusive
}

/** A fresh, ordered 52-card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`)
    }
  }
  return deck
}

/** Fisher-Yates shuffle. Returns a new array; the input is not mutated. */
export function shuffle<T>(
  items: readonly T[],
  randomInt: RandomInt = secureRandomInt,
): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/**
 * Draws `count` cards off the top of the deck. Returns the drawn cards and the
 * remaining deck, leaving the input untouched.
 */
export function draw(
  deck: readonly Card[],
  count: number,
): { drawn: Card[]; rest: Card[] } {
  if (count < 0 || count > deck.length) {
    throw new RangeError(`Cannot draw ${count} cards from a deck of ${deck.length}`)
  }
  return { drawn: deck.slice(0, count), rest: deck.slice(count) }
}
