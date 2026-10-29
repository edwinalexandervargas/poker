import { describe, expect, it } from 'vitest'
import { layoutSeats } from './seatLayout'

describe('layoutSeats', () => {
  it('heads-up: the opponent sits at the top centre', () => {
    expect(layoutSeats([0, 1], 0, 8).get(1)).toEqual({ left: 50, top: 11 })
  })

  it('places everyone except me', () => {
    const spots = layoutSeats([0, 1, 2, 3, 4, 5, 6, 7], 3, 8)
    expect(spots.size).toBe(7)
    expect(spots.has(3)).toBe(false)
  })

  it('the player after me in seat order is on my left (bottom-left)', () => {
    const spots = layoutSeats([0, 1, 2, 3, 4, 5, 6, 7], 3, 8)
    expect(spots.get(4)).toEqual({ left: 12, top: 74 })
    // and the player before me is on my right
    expect(spots.get(2)).toEqual({ left: 88, top: 74 })
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
