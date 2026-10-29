import { describe, expect, it } from 'vitest'
import { standings } from './standings.js'

describe('standings', () => {
  it('measures each player against what they bought in for, best first', () => {
    const result = standings(
      [
        { name: 'Alice', seat: 0, stack: 500 },
        { name: 'Bob', seat: 1, stack: 2500 },
        { name: 'Cara', seat: 2, stack: 0 },
      ],
      1000,
    )
    expect(result.map((s) => [s.name, s.net])).toEqual([
      ['Bob', 1500],
      ['Alice', -500],
      ['Cara', -1000],
    ])
  })

  it('counts every rebuy as another buy-in', () => {
    const [cara] = standings([{ name: 'Cara', seat: 2, stack: 1200, rebuys: 2 }], 1000)
    expect(cara).toEqual({
      name: 'Cara',
      seat: 2,
      stack: 1200,
      boughtIn: 3000,
      net: -1800,
    })
  })

  it('with no rebuys, the nets add up to zero (chips only move between players)', () => {
    const nets = standings(
      [
        { name: 'A', seat: 0, stack: 1700 },
        { name: 'B', seat: 1, stack: 300 },
        { name: 'C', seat: 2, stack: 1000 },
      ],
      1000,
    ).map((s) => s.net)
    expect(nets.reduce((a, b) => a + b, 0)).toBe(0)
  })

  it('ties are listed in seat order', () => {
    const result = standings(
      [
        { name: 'B', seat: 1, stack: 1000 },
        { name: 'A', seat: 0, stack: 1000 },
      ],
      1000,
    )
    expect(result.map((s) => s.name)).toEqual(['A', 'B'])
  })
})
