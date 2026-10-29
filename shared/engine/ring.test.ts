import { describe, expect, it } from 'vitest'
import { blindSeats, firstToAct, nextSeat } from './ring.js'

const all = (n: number) => Array<boolean>(n).fill(true)

describe('nextSeat', () => {
  it('moves one seat clockwise', () => {
    expect(nextSeat(0, 4, () => true)).toBe(1)
  })
  it('wraps from the last seat back to 0', () => {
    expect(nextSeat(3, 4, () => true)).toBe(0)
  })
  it('skips seats that do not qualify', () => {
    const inHand = [true, false, false, true]
    expect(nextSeat(0, 4, (s) => inHand[s]!)).toBe(3)
  })
  it('never returns the starting seat', () => {
    const inHand = [true, false, false]
    expect(nextSeat(0, 3, (s) => inHand[s]!)).toBeNull()
  })
})

describe('blindSeats', () => {
  it('heads-up: the button posts the small blind', () => {
    expect(blindSeats(1, all(2))).toEqual({ smallBlind: 1, bigBlind: 0 })
  })
  it('3+ players: the two players after the button post', () => {
    expect(blindSeats(0, all(6))).toEqual({ smallBlind: 1, bigBlind: 2 })
  })
  it('wraps around the table', () => {
    expect(blindSeats(4, all(6))).toEqual({ smallBlind: 5, bigBlind: 0 })
  })
  it('skips seats that are not dealt in', () => {
    // seats 1 and 2 are empty
    expect(blindSeats(0, [true, false, false, true, true])).toEqual({
      smallBlind: 3,
      bigBlind: 4,
    })
  })
  it('two players at an 8-seat table use the heads-up rule', () => {
    const dealt = [false, false, true, false, false, true, false, false]
    expect(blindSeats(5, dealt)).toEqual({ smallBlind: 5, bigBlind: 2 })
  })
  it('refuses a hand with fewer than two players', () => {
    expect(() => blindSeats(0, [true, false])).toThrow()
  })
})

describe('firstToAct', () => {
  it('heads-up preflop: the button acts first', () => {
    expect(firstToAct(0, 'preflop', all(2), all(2))).toBe(0)
  })
  it('heads-up after the flop: the other player acts first', () => {
    expect(firstToAct(0, 'flop', all(2), all(2))).toBe(1)
  })
  it('preflop with 6: the player after the big blind ("under the gun")', () => {
    expect(firstToAct(0, 'preflop', all(6), all(6))).toBe(3)
  })
  it('preflop with 3: the button is after the big blind, so it starts', () => {
    expect(firstToAct(0, 'preflop', all(3), all(3))).toBe(0)
  })
  it('after the flop: the first player after the button', () => {
    expect(firstToAct(2, 'turn', all(6), all(6))).toBe(3)
  })
  it('skips players who folded or are all-in', () => {
    expect(firstToAct(0, 'flop', all(6), [true, false, false, true, true, true])).toBe(3)
  })
  it('nobody can act: null', () => {
    expect(firstToAct(0, 'flop', all(3), [false, false, false])).toBeNull()
  })
  it('phases without betting: null', () => {
    expect(firstToAct(0, 'showdown', all(4), all(4))).toBeNull()
  })
})
