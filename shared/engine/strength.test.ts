import { describe, expect, it } from 'vitest'
import { handLabel, nutStrength } from './strength.js'

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

describe('nutStrength', () => {
  const nut = (hole: string[], community: string[]) =>
    nutStrength(hole as never, community as never)

  it('before the flop, pocket aces are the nuts', () => {
    const r = nut(['As', 'Ad'], [])!
    expect(r.score).toBe(1)
    expect(r.ahead).toBe(0)
  })

  it('before the flop, better starting hands score higher', () => {
    const order = [
      ['Kd', 'Kc'],
      ['As', 'Ks'],
      ['Jh', 'Th'],
      ['9c', '9d'],
      ['Kd', '8c'],
      ['7d', '2c'],
    ]
    const scores = order.map((hole) => nut(hole, [])!.score)
    for (let i = 1; i < scores.length; i++)
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]!)
    expect(scores.at(-1)).toBe(0)
  })

  it('counts every hand an opponent could hold: 1,081 on the flop', () => {
    expect(nut(['As', 'Ad'], ['Kh', '7c', '2d'])!.total).toBe(1081)
    expect(nut(['As', 'Ad'], ['Kh', '7c', '2d', '9s', '4h'])!.total).toBe(990)
  })

  it('a royal flush is the nuts: nothing beats it', () => {
    const r = nut(['As', 'Ks'], ['Qs', 'Js', 'Ts', '2c', '3d'])!
    expect(r.better).toBe(0)
    expect(r.score).toBe(1)
  })

  it('top set on a dry board is near the nuts', () => {
    const r = nut(['Ah', 'Ad'], ['As', '7c', '2d'])!
    expect(r.score).toBeGreaterThan(0.99)
  })

  it('a low pair on a scary board is far from it', () => {
    const r = nut(['2c', '3d'], ['Ah', 'Kh', 'Qh', 'Jd', '2s'])!
    expect(r.score).toBeLessThan(0.5)
    expect(r.better).toBeGreaterThan(400)
  })

  it('a better hand always scores higher on the same board', () => {
    const board = ['Kh', '9c', '4d', '7s', '2h']
    expect(nut(['Ks', 'Kd'], board)!.score).toBeGreaterThan(
      nut(['Kc', '9d'], board)!.score,
    )
    expect(nut(['Kc', '9d'], board)!.score).toBeGreaterThan(
      nut(['Ac', '3d'], board)!.score,
    )
  })

  it('when the board itself is the best hand, you have the nuts too', () => {
    const r = nut(['2c', '3d'], ['As', 'Ks', 'Qs', 'Js', 'Ts'])!
    expect(r.better).toBe(0)
    expect(r.ahead).toBe(0)
    expect(r.score).toBe(1)
  })

  it('top pair is not near the nuts when sets and two pair are possible', () => {
    const r = nut(['Ac', 'Kd'], ['Ah', '9c', '4d'])!
    expect(r.ahead).toBeGreaterThan(5)
    expect(r.score).toBeLessThan(0.95)
  })

  it('the bar moves as the board changes', () => {
    const flop = nut(['Ah', 'Kh'], ['Qh', '7h', '2c'])!
    const turn = nut(['Ah', 'Kh'], ['Qh', '7h', '2c', '9h'])!
    expect(turn.ahead).toBe(0)
    expect(turn.score).toBeGreaterThan(flop.score)
  })
})
