import { describe, expect, it } from 'vitest'
import { betSpot, layoutSeats, POT_SPOT } from './seatLayout'

describe('layoutSeats', () => {
  it('heads-up: the opponent sits at the top centre', () => {
    expect(layoutSeats([0, 1], 0, 8).get(1)).toEqual(
      expect.objectContaining({ left: 50, top: 11 }),
    )
  })

  it('places everyone except me', () => {
    const spots = layoutSeats([0, 1, 2, 3, 4, 5, 6, 7], 3, 8)
    expect(spots.size).toBe(7)
    expect(spots.has(3)).toBe(false)
  })

  it('the player after me in seat order is on my left (bottom-left)', () => {
    const spots = layoutSeats([0, 1, 2, 3, 4, 5, 6, 7], 3, 8)
    expect(spots.get(4)).toMatchObject({ left: 12, top: 74 })
    // and the player before me is on my right
    expect(spots.get(2)).toMatchObject({ left: 88, top: 74 })
  })

  it('gives every player a different spot', () => {
    for (let n = 2; n <= 8; n++) {
      const seats = Array.from({ length: n }, (_, i) => i)
      const spots = [...layoutSeats(seats, 0, 8).values()].map(
        (s) => `${s.left},${s.top}`,
      )
      expect(new Set(spots).size).toBe(n - 1)
    }
  })
})

describe('betSpot', () => {
  it('sits between the seat and the pot', () => {
    const spot = betSpot({ left: 10, top: 46 })
    expect(spot.left).toBeGreaterThan(10)
    expect(spot.left).toBeLessThan(POT_SPOT.left)
  })
  it('uses the hand-placed bet spot when the seat has one', () => {
    expect(betSpot({ left: 10, top: 42, bet: { left: 25, top: 37 } })).toEqual({
      left: 25,
      top: 37,
    })
  })
  it('share 0 is the seat itself, share 1 the pot', () => {
    expect(betSpot({ left: 10, top: 80 }, 0)).toEqual({ left: 10, top: 80 })
    expect(betSpot({ left: 10, top: 80 }, 1)).toEqual(POT_SPOT)
  })
})
