import { describe, expect, it } from 'vitest'
import type { RandomInt } from './deck.js'
import { equityIterations, estimateEquity, handLabel } from './strength.js'

/** A repeatable random source (mulberry32), so the estimates are the same every run. */
function seeded(seed: number): RandomInt {
  let a = seed
  return (max) => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max)
  }
}

describe('handLabel', () => {
  it('names a pocket pair', () => {
    expect(handLabel(['As', 'Ad'], [])).toBe('Pair of Aces')
    expect(handLabel(['7c', '7h'], [])).toBe('Pair of Sevens')
  })
  it('names two cards, high card first, suited or not', () => {
    expect(handLabel(['Ks', 'As'], [])).toBe('Ace-King suited')
    expect(handLabel(['Td', 'Qc'], [])).toBe('Queen-Ten offsuit')
  })
  it('after the flop, names the best hand', () => {
    expect(handLabel(['As', 'Kd'], ['Ah', '7c', '2d'])).toBe("Pair, A's")
    expect(handLabel(['9s', '8s'], ['7s', '6s', '5s'])).toMatch(/Straight Flush/)
  })
})

describe('estimateEquity', () => {
  const run = (hole: string[], community: string[], opponents: number, seed = 1) =>
    estimateEquity({
      hole: hole as never,
      community: community as never,
      opponents,
      iterations: 1500,
      randomInt: seeded(seed),
    })

  it('pocket aces against one player win about 85% of the time', () => {
    expect(run(['As', 'Ad'], [], 1)).toBeGreaterThan(0.8)
    expect(run(['As', 'Ad'], [], 1)).toBeLessThan(0.9)
  })

  it('seven-two offsuit is a big underdog', () => {
    expect(run(['7c', '2d'], [], 1)).toBeLessThan(0.4)
  })

  it('more opponents means less chance to win', () => {
    expect(run(['As', 'Ad'], [], 5)).toBeLessThan(run(['As', 'Ad'], [], 1))
  })

  it('the nuts on the river always wins', () => {
    expect(run(['As', 'Ks'], ['Qs', 'Js', 'Ts', '2c', '3d'], 3)).toBe(1)
  })

  it('a royal flush on the board for everyone is a split', () => {
    expect(run(['2c', '3d'], ['As', 'Ks', 'Qs', 'Js', 'Ts'], 1)).toBeCloseTo(0.5, 5)
  })

  it('nobody left to beat: 100%', () => {
    expect(run(['2c', '3d'], [], 0)).toBe(1)
  })

  it('never uses a card that is already showing', () => {
    // If it did, an opponent could be dealt the A♠ you hold, and AA would look weaker.
    const seen: string[] = []
    estimateEquity({
      hole: ['As', 'Ad'],
      community: ['Kh', 'Qc', '2d'],
      opponents: 2,
      iterations: 50,
      randomInt: (max) => {
        seen.push(String(max))
        return 0
      },
    })
    // 52 - 2 hole - 3 board = 47 unseen cards to choose from at first
    expect(seen[0]).toBe('47')
  })
})

describe('equityIterations', () => {
  it('runs more simulations heads-up than at a full table', () => {
    expect(equityIterations(2, 1)).toBeGreaterThan(equityIterations(8, 7))
  })
  it('stays within sensible bounds', () => {
    expect(equityIterations(2, 1)).toBeLessThanOrEqual(1500)
    expect(equityIterations(8, 7)).toBeGreaterThanOrEqual(60)
  })
})
