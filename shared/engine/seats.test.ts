import { describe, expect, it } from 'vitest'
import { firstToAct, getBlindSeats, otherSeat } from './seats.js'

describe('otherSeat', () => {
  it('flips between the two seats', () => {
    expect(otherSeat(0)).toBe(1)
    expect(otherSeat(1)).toBe(0)
  })
})

describe('getBlindSeats (heads-up: the button posts the small blind)', () => {
  it('button on seat 0: seat 0 is the small blind, seat 1 the big blind', () => {
    expect(getBlindSeats(0)).toEqual({ smallBlind: 0, bigBlind: 1 })
  })

  it('button on seat 1: seat 1 is the small blind, seat 0 the big blind', () => {
    expect(getBlindSeats(1)).toEqual({ smallBlind: 1, bigBlind: 0 })
  })
})

describe('firstToAct (heads-up: the button acts first preflop, last after)', () => {
  it('preflop: the button acts first', () => {
    expect(firstToAct(0, 'preflop')).toBe(0)
    expect(firstToAct(1, 'preflop')).toBe(1)
  })

  it('flop, turn and river: the player who is NOT the button acts first', () => {
    for (const phase of ['flop', 'turn', 'river'] as const) {
      expect(firstToAct(0, phase)).toBe(1)
      expect(firstToAct(1, phase)).toBe(0)
    }
  })

  it('returns null when nobody is betting', () => {
    for (const phase of ['waiting', 'showdown', 'complete'] as const) {
      expect(firstToAct(0, phase)).toBeNull()
      expect(firstToAct(1, phase)).toBeNull()
    }
  })
})
