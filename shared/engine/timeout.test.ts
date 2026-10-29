import { describe, expect, it } from 'vitest'
import type { HandState } from './hand.js'
import { timeoutAction } from './timeout.js'

const BIG_BLIND = 20

// Seat 0 is the small blind and about to act, as right after startHand.
function hand(overrides: Partial<HandState> = {}): HandState {
  return {
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
  }
}

describe('timeoutAction', () => {
  it('folds when the player is facing a bet', () => {
    // Seat 0 has 10 in and must call 10 more.
    expect(timeoutAction(hand(), BIG_BLIND)).toEqual({ type: 'fold' })
  })

  it('checks when there is nothing to call', () => {
    // The big blind, after the small blind just called: bets are equal.
    expect(
      timeoutAction(hand({ toAct: 1, bets: [20, 20], stacks: [980, 980] }), BIG_BLIND),
    ).toEqual({ type: 'check' })
  })

  it('checks on a fresh street with no bets', () => {
    expect(
      timeoutAction(
        hand({ phase: 'flop', toAct: 1, bets: [0, 0], stacks: [900, 900], pot: 200 }),
        BIG_BLIND,
      ),
    ).toEqual({ type: 'check' })
  })

  it('throws when nobody is to act', () => {
    expect(() => timeoutAction(hand({ toAct: null }), BIG_BLIND)).toThrow()
  })
})
