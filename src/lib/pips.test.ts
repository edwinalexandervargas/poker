import { describe, expect, it } from 'vitest'
import { pipsFor } from './pips'

describe('pipsFor', () => {
  it('a number card has as many pips as its number', () => {
    for (const [rank, count] of [
      ['2', 2],
      ['3', 3],
      ['4', 4],
      ['5', 5],
      ['6', 6],
      ['7', 7],
      ['8', 8],
      ['9', 9],
      ['T', 10],
    ] as const) {
      expect(pipsFor(rank)).toHaveLength(count)
    }
  })

  it('aces and court cards have no pip layout (they are drawn differently)', () => {
    for (const rank of ['A', 'J', 'Q', 'K']) expect(pipsFor(rank)).toEqual([])
  })

  it('pips in the bottom half are upside down, like a real card', () => {
    for (const p of pipsFor('8')) expect(p.flip).toBe(p.y > 50)
  })

  it('every layout is symmetrical: turned upside down, it lands on itself', () => {
    for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', 'T']) {
      const spots = pipsFor(rank).map((p) => `${p.x},${p.y}`)
      const turned = pipsFor(rank).map((p) => `${100 - p.x},${100 - p.y}`)
      // 7 is the classic exception: its extra pip sits in the top half only
      if (rank === '7') continue
      expect(new Set(turned)).toEqual(new Set(spots))
    }
  })

  it('no two pips on the same spot', () => {
    for (const rank of ['2', '3', '4', '5', '6', '7', '8', '9', 'T']) {
      const spots = pipsFor(rank).map((p) => `${p.x},${p.y}`)
      expect(new Set(spots).size).toBe(spots.length)
    }
  })
})
