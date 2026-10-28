import { describe, expect, it } from 'vitest'
import { createDeck } from './deck.js'
import { startHand, type StartHandInput } from './hand.js'

// An unshuffled deck is fine here: we only care where each card ends up.
const deck = createDeck()

function input(overrides: Partial<StartHandInput> = {}): StartHandInput {
  return {
    handNumber: 1,
    button: 0,
    stacks: [1000, 1000],
    smallBlind: 10,
    bigBlind: 20,
    deck,
    ...overrides,
  }
}

describe('startHand: the basics', () => {
  it('starts preflop with an empty board and an empty pot', () => {
    const hand = startHand(input({ handNumber: 7 }))
    expect(hand.handNumber).toBe(7)
    expect(hand.phase).toBe('preflop')
    expect(hand.community).toEqual([])
    expect(hand.pot).toBe(0)
  })

  it('keeps the button where it was told', () => {
    expect(startHand(input({ button: 0 })).button).toBe(0)
    expect(startHand(input({ button: 1 })).button).toBe(1)
  })

  it('the button acts first preflop', () => {
    expect(startHand(input({ button: 0 })).toAct).toBe(0)
    expect(startHand(input({ button: 1 })).toAct).toBe(1)
  })
})

describe('startHand: blinds', () => {
  it('button on seat 0: seat 0 posts the small blind, seat 1 the big blind', () => {
    const hand = startHand(input({ button: 0 }))
    expect(hand.bets).toEqual([10, 20])
    expect(hand.stacks).toEqual([990, 980])
  })

  it('button on seat 1: seat 1 posts the small blind, seat 0 the big blind', () => {
    const hand = startHand(input({ button: 1 }))
    expect(hand.bets).toEqual([20, 10])
    expect(hand.stacks).toEqual([980, 990])
  })

  it('a short stack posts what it has, not more', () => {
    // Seat 0 is the button (small blind) but only has 5 chips.
    const hand = startHand(input({ button: 0, stacks: [5, 1000] }))
    expect(hand.bets).toEqual([5, 20])
    expect(hand.stacks).toEqual([0, 980])
  })

  it('never creates or destroys chips', () => {
    for (const button of [0, 1] as const) {
      const hand = startHand(input({ button, stacks: [1500, 500] }))
      const total =
        hand.stacks[0] + hand.stacks[1] + hand.bets[0] + hand.bets[1] + hand.pot
      expect(total).toBe(2000)
    }
  })
})

describe('startHand: dealing', () => {
  it('button on seat 0: dealing starts with seat 1 (the player after the button)', () => {
    const hand = startHand(input({ button: 0 }))
    expect(hand.holeCards[1]).toEqual([deck[0], deck[2]])
    expect(hand.holeCards[0]).toEqual([deck[1], deck[3]])
  })

  it('button on seat 1: dealing starts with seat 0', () => {
    const hand = startHand(input({ button: 1 }))
    expect(hand.holeCards[0]).toEqual([deck[0], deck[2]])
    expect(hand.holeCards[1]).toEqual([deck[1], deck[3]])
  })

  it('leaves the other 48 cards in the deck, in order', () => {
    const hand = startHand(input())
    expect(hand.deck).toHaveLength(48)
    expect(hand.deck).toEqual(deck.slice(4))
  })

  it('does not change the deck it was given', () => {
    const before = [...deck]
    startHand(input())
    expect(deck).toEqual(before)
  })

  it('refuses to start with too few cards for a full hand', () => {
    expect(() => startHand(input({ deck: deck.slice(0, 8) }))).toThrow(RangeError)
    expect(() => startHand(input({ deck: deck.slice(0, 9) }))).not.toThrow()
  })
})
