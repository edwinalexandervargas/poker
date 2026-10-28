import { describe, expect, it } from 'vitest'
import { createDeck, draw, secureRandomInt, shuffle, type RandomInt } from './deck.js'

/** Small deterministic PRNG (mulberry32) so shuffle tests are repeatable. */
function seeded(seed: number): RandomInt {
  let a = seed
  return (maxExclusive) => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    const float = ((t ^ (t >>> 14)) >>> 0) / 4294967296
    return Math.floor(float * maxExclusive)
  }
}

describe('createDeck', () => {
  it('has 52 unique cards', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck).size).toBe(52)
  })
})

describe('shuffle', () => {
  it('keeps the same cards and does not mutate the input', () => {
    const deck = createDeck()
    const copy = [...deck]
    const shuffled = shuffle(deck, seeded(1))
    expect(deck).toEqual(copy)
    expect([...shuffled].sort()).toEqual([...deck].sort())
  })

  it('is deterministic for a given seed and differs across seeds', () => {
    const deck = createDeck()
    expect(shuffle(deck, seeded(42))).toEqual(shuffle(deck, seeded(42)))
    expect(shuffle(deck, seeded(42))).not.toEqual(shuffle(deck, seeded(43)))
  })

  it('actually reorders the deck', () => {
    const deck = createDeck()
    expect(shuffle(deck, seeded(7))).not.toEqual(deck)
  })

  it('works with the secure default RNG', () => {
    const shuffled = shuffle(createDeck())
    expect(new Set(shuffled).size).toBe(52)
  })
})

describe('secureRandomInt', () => {
  it('stays within bounds', () => {
    for (let i = 0; i < 500; i++) {
      const n = secureRandomInt(52)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(52)
    }
  })

  it('rejects invalid bounds', () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError)
    expect(() => secureRandomInt(1.5)).toThrow(RangeError)
  })
})

describe('draw', () => {
  it('takes cards off the top without mutating the deck', () => {
    const deck = createDeck()
    const { drawn, rest } = draw(deck, 5)
    expect(drawn).toEqual(deck.slice(0, 5))
    expect(rest).toHaveLength(47)
    expect(deck).toHaveLength(52)
  })

  it('throws when drawing more than remain', () => {
    expect(() => draw(['As', 'Kd'], 3)).toThrow(RangeError)
  })
})
