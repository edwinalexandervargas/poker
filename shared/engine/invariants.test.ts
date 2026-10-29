import { describe, expect, it } from 'vitest'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'
import { findProblems } from './invariants.js'

// A healthy hand on the flop: 52 cards all accounted for, 2000 chips all accounted for.
function healthy(overrides: Partial<HandState> = {}): HandState {
  const all = createDeck()
  return {
    handNumber: 1,
    phase: 'flop',
    button: 0,
    toAct: 1,
    stacks: [900, 900],
    bets: [0, 40],
    pot: 160,
    actionsThisRound: 0,
    community: all.slice(4, 7),
    holeCards: [all.slice(0, 2), all.slice(2, 4)],
    deck: all.slice(7),
    ...overrides,
  }
}

const TOTAL = 2000

describe('findProblems: a healthy hand', () => {
  it('reports nothing', () => {
    expect(findProblems(healthy(), TOTAL)).toEqual([])
  })

  it('accepts a finished hand', () => {
    expect(findProblems(healthy({ phase: 'complete', toAct: null }), TOTAL)).toEqual([])
  })

  it('accepts a finished hand with any number of board cards (a fold can end it early)', () => {
    const all = createDeck()
    const early = healthy({
      phase: 'complete',
      toAct: null,
      community: [],
      deck: all.slice(4),
    })
    expect(findProblems(early, TOTAL)).toEqual([])
  })

  it('accepts a player to act who has chips while the other is all-in', () => {
    const allIn = healthy({ stacks: [0, 900], bets: [100, 40], pot: 960, toAct: 1 })
    expect(findProblems(allIn, TOTAL)).toEqual([])
  })
})

describe('findProblems: chips', () => {
  it('catches chips that disappeared', () => {
    expect(findProblems(healthy({ pot: 150 }), TOTAL).length).toBeGreaterThan(0)
  })

  it('catches chips that appeared', () => {
    expect(findProblems(healthy({ stacks: [950, 900] }), TOTAL).length).toBeGreaterThan(0)
  })

  it('catches a negative stack', () => {
    expect(
      findProblems(healthy({ stacks: [-50, 1000], bets: [0, 40], pot: 110 }), TOTAL)
        .length,
    ).toBeGreaterThan(0)
  })

  it('catches a fractional amount', () => {
    expect(
      findProblems(healthy({ stacks: [900.5, 899.5] }), TOTAL).length,
    ).toBeGreaterThan(0)
  })
})

describe('findProblems: cards', () => {
  it('catches a missing card', () => {
    const hand = healthy()
    expect(
      findProblems({ ...hand, deck: hand.deck.slice(1) }, TOTAL).length,
    ).toBeGreaterThan(0)
  })

  it('catches a duplicated card', () => {
    const hand = healthy()
    const dup = { ...hand, deck: [...hand.deck.slice(1), hand.holeCards[0][0]!] }
    expect(findProblems(dup, TOTAL).length).toBeGreaterThan(0)
  })

  it('catches a board that does not match the phase', () => {
    const all = createDeck()
    const bad = healthy({ phase: 'turn', community: all.slice(4, 7) })
    expect(findProblems(bad, TOTAL).length).toBeGreaterThan(0)
  })

  it('catches a player without two hole cards', () => {
    const all = createDeck()
    const bad = healthy({
      holeCards: [all.slice(0, 1), all.slice(2, 4)],
      deck: all.slice(7),
    })
    expect(findProblems(bad, TOTAL).length).toBeGreaterThan(0)
  })
})

describe('findProblems: whose turn', () => {
  it('catches nobody to act during betting', () => {
    expect(findProblems(healthy({ toAct: null }), TOTAL).length).toBeGreaterThan(0)
  })

  it('catches somebody to act when the hand is complete', () => {
    expect(
      findProblems(healthy({ phase: 'complete', toAct: 0 }), TOTAL).length,
    ).toBeGreaterThan(0)
  })

  it('catches a player to act who has no chips', () => {
    const stuck = healthy({ stacks: [0, 900], bets: [100, 40], pot: 960, toAct: 0 })
    expect(findProblems(stuck, TOTAL).length).toBeGreaterThan(0)
  })
})
