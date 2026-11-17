import { describe, expect, it } from 'vitest'
import { initials, SEAT_COLORS, seatColor } from '@/lib/seatColors'

describe('initials', () => {
  it('uses the first letter of a single name', () => {
    expect(initials('maya')).toBe('M')
  })
  it('uses the first and last words of a longer name', () => {
    expect(initials('Jordan van der Berg')).toBe('JB')
  })
  it('ignores extra spaces and has a fallback for an empty name', () => {
    expect(initials('  Sam   Lee ')).toBe('SL')
    expect(initials('   ')).toBe('?')
  })
})

describe('seatColor', () => {
  it('gives every seat at a full table a different colour', () => {
    const colours = Array.from({ length: 8 }, (_, seat) => seatColor(seat))
    expect(new Set(colours).size).toBe(8)
    expect(colours).toEqual([...SEAT_COLORS])
  })
})
