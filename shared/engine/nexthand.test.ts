import { describe, expect, it } from 'vitest'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'
import { nextHand } from './nexthand.js'

const deck = createDeck()

function finished(overrides: Partial<HandState> = {}): HandState {
  return {
    handNumber: 3,
    phase: 'complete',
    button: 0,
    toAct: null,
    stacks: [1100, 900],
    bets: [0, 0],
    pot: 0,
    actionsThisRound: 0,
    community: [],
    holeCards: [[], []],
    deck: [],
    ...overrides,
  }
}

describe('nextHand: starting the next hand', () => {
  it('counts hands up by one', () => {
    expect(nextHand(finished(), 10, 20, deck)!.handNumber).toBe(4)
  })

  it('moves the button to the other seat', () => {
    expect(nextHand(finished({ button: 0 }), 10, 20, deck)!.button).toBe(1)
    expect(nextHand(finished({ button: 1 }), 10, 20, deck)!.button).toBe(0)
  })

  it('carries the chips over and posts the new blinds', () => {
    // The button moves to seat 1, so seat 1 is the small blind and seat 0 the big blind.
    const next = nextHand(finished({ stacks: [1100, 900], button: 0 }), 10, 20, deck)!
    expect(next.bets).toEqual([20, 10])
    expect(next.stacks).toEqual([1080, 890])
  })

  it('is a fresh hand: preflop, empty board, empty pot, new cards', () => {
    const next = nextHand(finished(), 10, 20, deck)!
    expect(next.phase).toBe('preflop')
    expect(next.community).toEqual([])
    expect(next.pot).toBe(0)
    expect(next.actionsThisRound).toBe(0)
    expect(next.holeCards[0]).toHaveLength(2)
    expect(next.holeCards[1]).toHaveLength(2)
    expect(next.deck).toEqual(deck.slice(4))
  })

  it('never creates or destroys chips', () => {
    const next = nextHand(finished({ stacks: [1500, 500] }), 10, 20, deck)!
    expect(next.stacks[0] + next.stacks[1] + next.bets[0] + next.bets[1] + next.pot).toBe(2000)
  })
})

describe('nextHand: the game can end', () => {
  it('returns null when seat 0 has no chips', () => {
    expect(nextHand(finished({ stacks: [0, 2000] }), 10, 20, deck)).toBeNull()
  })

  it('returns null when seat 1 has no chips', () => {
    expect(nextHand(finished({ stacks: [2000, 0] }), 10, 20, deck)).toBeNull()
  })
})

describe('nextHand: guard rails', () => {
  it('throws if the previous hand is not finished', () => {
    expect(() => nextHand(finished({ phase: 'river' }), 10, 20, deck)).toThrow()
    expect(() => nextHand(finished({ phase: 'showdown' }), 10, 20, deck)).toThrow()
  })

  it('does not change the hand it was given', () => {
    const before = finished()
    const snapshot = JSON.parse(JSON.stringify(before))
    nextHand(before, 10, 20, deck)
    expect(before).toEqual(snapshot)
  })
})
