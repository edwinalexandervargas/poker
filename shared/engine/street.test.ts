import { headsUp, type HeadsUpFixture } from './testHand.js'
import { describe, expect, it } from 'vitest'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'
import { advanceStreet, isRoundOver } from './street.js'

const deck = createDeck().slice(4) // pretend 4 hole cards are already dealt

function hand(overrides: Partial<HeadsUpFixture> = {}): HandState {
  return headsUp({
    handNumber: 1,
    phase: 'preflop',
    button: 0,
    toAct: 0,
    stacks: [980, 980],
    bets: [20, 20],
    pot: 0,
    actionsThisRound: 2,
    community: [],
    holeCards: [[], []],
    deck,
    ...overrides,
  } as HeadsUpFixture)
}

describe('isRoundOver', () => {
  it('is not over before anyone has acted', () => {
    expect(isRoundOver(hand({ actionsThisRound: 0 }))).toBe(false)
  })

  it('is not over when the big blind has not had their option yet (equal bets, one move)', () => {
    expect(isRoundOver(hand({ bets: [20, 20], actionsThisRound: 1 }))).toBe(false)
  })

  it('is over after check, check', () => {
    expect(isRoundOver(hand({ phase: 'flop', bets: [0, 0], actionsThisRound: 2 }))).toBe(
      true,
    )
  })

  it('is over when a raise has been called', () => {
    expect(isRoundOver(hand({ bets: [60, 60], actionsThisRound: 2 }))).toBe(true)
  })

  it('is not over while a bet is waiting to be answered', () => {
    expect(isRoundOver(hand({ bets: [60, 20], actionsThisRound: 1 }))).toBe(false)
  })

  it('is not over after a re-raise, even though both have acted', () => {
    expect(
      isRoundOver(hand({ bets: [60, 100], stacks: [900, 800], actionsThisRound: 2 })),
    ).toBe(false)
  })

  it('is over when the smaller bet is a call that put the player all-in', () => {
    expect(
      isRoundOver(hand({ bets: [100, 50], stacks: [400, 0], actionsThisRound: 2 })),
    ).toBe(true)
  })

  it('is not over when the smaller bet still has chips behind it', () => {
    expect(
      isRoundOver(hand({ bets: [100, 50], stacks: [400, 300], actionsThisRound: 2 })),
    ).toBe(false)
  })
})

describe('advanceStreet: moving to the next phase', () => {
  it('preflop to flop: three board cards off the top, the rest stay in the deck', () => {
    const next = advanceStreet(hand())
    expect(next.phase).toBe('flop')
    expect(next.community).toEqual(deck.slice(0, 3))
    expect(next.deck).toEqual(deck.slice(3))
  })

  it('flop to turn adds one card to the board', () => {
    const flop = deck.slice(0, 3)
    const next = advanceStreet(
      hand({ phase: 'flop', community: flop, deck: deck.slice(3) }),
    )
    expect(next.phase).toBe('turn')
    expect(next.community).toEqual(deck.slice(0, 4))
  })

  it('turn to river adds one card to the board', () => {
    const next = advanceStreet(
      hand({ phase: 'turn', community: deck.slice(0, 4), deck: deck.slice(4) }),
    )
    expect(next.phase).toBe('river')
    expect(next.community).toEqual(deck.slice(0, 5))
  })

  it('river to showdown deals nothing and nobody is to act', () => {
    const next = advanceStreet(
      hand({ phase: 'river', community: deck.slice(0, 5), deck: deck.slice(5) }),
    )
    expect(next.phase).toBe('showdown')
    expect(next.community).toHaveLength(5)
    expect(next.toAct).toBeNull()
  })

  it('throws when there is no next street', () => {
    expect(() => advanceStreet(hand({ phase: 'showdown' }))).toThrow()
    expect(() => advanceStreet(hand({ phase: 'complete' }))).toThrow()
  })
})

describe('advanceStreet: who acts', () => {
  it('after the flop is dealt, the player who is NOT the button acts first', () => {
    expect(advanceStreet(hand({ button: 0 })).toAct).toBe(1)
    expect(advanceStreet(hand({ button: 1 })).toAct).toBe(0)
  })
})

describe('advanceStreet: the chips', () => {
  it('collects matched bets into the pot', () => {
    const next = advanceStreet(hand({ bets: [60, 60], stacks: [940, 940], pot: 100 }))
    expect(next.pot).toBe(220)
    expect(next.bets).toEqual([0, 0])
    expect(next.stacks).toEqual([940, 940])
  })

  it('gives back the part of a bet that was never matched', () => {
    // Seat 0 bet 100, seat 1 could only call 50 (all-in).
    const next = advanceStreet(hand({ bets: [100, 50], stacks: [400, 0], pot: 0 }))
    expect(next.pot).toBe(100)
    expect(next.stacks).toEqual([450, 0])
    expect(next.bets).toEqual([0, 0])
  })

  it('never creates or destroys chips', () => {
    const before = hand({ bets: [100, 50], stacks: [400, 0], pot: 70 })
    const next = advanceStreet(before)
    const total = (h: HandState) =>
      h.stacks[0]! + h.stacks[1]! + h.bets[0]! + h.bets[1]! + h.pot
    expect(total(next)).toBe(total(before))
  })

  it('starts the new round with no moves made', () => {
    expect(advanceStreet(hand()).acted).toEqual([false, false])
  })
})

describe('advanceStreet: purity', () => {
  it('does not change the hand it was given', () => {
    const before = hand({ bets: [100, 50], stacks: [400, 0], pot: 70 })
    const snapshot = JSON.parse(JSON.stringify(before))
    advanceStreet(before)
    expect(before).toEqual(snapshot)
  })
})
