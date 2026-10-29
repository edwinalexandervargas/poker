import { headsUp, type HeadsUpFixture } from './testHand.js'
import { describe, expect, it } from 'vitest'
import { applyAction } from './apply.js'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'

const BIG_BLIND = 20

// Seat 0 is the small blind and about to act, as right after startHand.
function hand(overrides: Partial<HeadsUpFixture> = {}): HandState {
  return headsUp({
    handNumber: 1,
    phase: 'preflop',
    button: 0,
    toAct: 0,
    stacks: [990, 980],
    bets: [10, 20],
    pot: 0,
    actionsThisRound: 0,
    community: [],
    holeCards: [[], []],
    deck: [],
    ...overrides,
  } as HeadsUpFixture)
}

describe('applyAction: nobody to act', () => {
  it('throws', () => {
    expect(() =>
      applyAction(hand({ toAct: null }), { type: 'check' }, BIG_BLIND),
    ).toThrow()
  })
})

describe('applyAction: check', () => {
  it('passes the turn and changes no chips', () => {
    const next = applyAction(
      hand({ toAct: 1, bets: [20, 20], stacks: [980, 980] }),
      { type: 'check' },
      BIG_BLIND,
    )
    expect(next.toAct).toBe(0)
    expect(next.bets).toEqual([20, 20])
    expect(next.stacks).toEqual([980, 980])
  })

  it('throws when there is a bet to call', () => {
    expect(() => applyAction(hand(), { type: 'check' }, BIG_BLIND)).toThrow()
  })
})

describe('applyAction: call', () => {
  it('the small blind calls: chips move from stack to bet, turn passes', () => {
    const next = applyAction(hand(), { type: 'call' }, BIG_BLIND)
    expect(next.bets).toEqual([20, 20])
    expect(next.stacks).toEqual([980, 980])
    expect(next.toAct).toBe(1)
  })

  it('a short stack calls for what it has', () => {
    const next = applyAction(
      hand({ bets: [0, 100], stacks: [50, 800], deck: createDeck() }),
      { type: 'call' },
      BIG_BLIND,
    )
    // Seat 0 calls all-in for 50. Only 50 is matched, so seat 1 gets 50 back,
    // and with nobody able to bet the board runs out.
    expect(next.pot).toBe(100)
    expect(next.stacks).toEqual([0, 850])
    expect(next.bets).toEqual([0, 0])
    expect(next.toAct).toBeNull()
  })

  it('throws when there is nothing to call', () => {
    expect(() =>
      applyAction(
        hand({ toAct: 1, bets: [20, 20], stacks: [980, 980] }),
        { type: 'call' },
        BIG_BLIND,
      ),
    ).toThrow()
  })
})

describe('applyAction: raise', () => {
  it('amount is the total bet: only the difference leaves the stack', () => {
    const next = applyAction(hand(), { type: 'raise', amount: 60 }, BIG_BLIND)
    expect(next.bets).toEqual([60, 20])
    expect(next.stacks).toEqual([940, 980])
    expect(next.toAct).toBe(1)
  })

  it('throws below the minimum raise', () => {
    expect(() => applyAction(hand(), { type: 'raise', amount: 30 }, BIG_BLIND)).toThrow()
  })

  it('throws above the maximum raise', () => {
    expect(() =>
      applyAction(hand(), { type: 'raise', amount: 5000 }, BIG_BLIND),
    ).toThrow()
  })

  it('throws when the opponent is all-in and a raise is impossible', () => {
    expect(() =>
      applyAction(
        hand({ bets: [0, 100], stacks: [500, 0] }),
        { type: 'raise', amount: 200 },
        BIG_BLIND,
      ),
    ).toThrow()
  })
})

describe('applyAction: fold', () => {
  it('the other player wins the bets and the hand is over', () => {
    const next = applyAction(hand(), { type: 'fold' }, BIG_BLIND)
    expect(next.stacks).toEqual([990, 1010])
    expect(next.bets).toEqual([0, 0])
    expect(next.pot).toBe(0)
    expect(next.phase).toBe('complete')
    expect(next.toAct).toBeNull()
  })

  it('the winner also gets the pot from earlier rounds', () => {
    const next = applyAction(
      hand({ phase: 'turn', toAct: 1, bets: [50, 0], stacks: [800, 900], pot: 250 }),
      { type: 'fold' },
      BIG_BLIND,
    )
    expect(next.stacks).toEqual([1100, 900])
    expect(next.pot).toBe(0)
  })

  it('never creates or destroys chips', () => {
    const before = hand({ pot: 100 })
    const next = applyAction(before, { type: 'fold' }, BIG_BLIND)
    const total = (h: HandState) =>
      h.stacks[0]! + h.stacks[1]! + h.bets[0]! + h.bets[1]! + h.pot
    expect(total(next)).toBe(total(before))
  })
})

describe('applyAction: purity', () => {
  it('does not change the hand it was given', () => {
    const before = hand()
    const snapshot = JSON.parse(JSON.stringify(before))
    applyAction(before, { type: 'raise', amount: 60 }, BIG_BLIND)
    applyAction(before, { type: 'call' }, BIG_BLIND)
    applyAction(before, { type: 'fold' }, BIG_BLIND)
    expect(before).toEqual(snapshot)
  })
})
