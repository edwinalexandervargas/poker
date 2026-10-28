import { describe, expect, it } from 'vitest'
import { getLegalActions } from './actions.js'
import type { HandState } from './hand.js'

const BIG_BLIND = 20

// Builds a hand state by hand so each test shows exactly the chips that matter.
function hand(overrides: Partial<HandState> = {}): HandState {
  return {
    handNumber: 1,
    phase: 'preflop',
    button: 0,
    toAct: 0,
    stacks: [990, 980],
    bets: [10, 20],
    pot: 0,
    community: [],
    holeCards: [[], []],
    deck: [],
    ...overrides,
  }
}

describe('getLegalActions: nobody to act', () => {
  it('returns null when it is nobody’s turn', () => {
    expect(getLegalActions(hand({ toAct: null }), BIG_BLIND)).toBeNull()
  })
})

describe('getLegalActions: facing a bet', () => {
  it('the small blind preflop must call 10 more, and cannot check', () => {
    const legal = getLegalActions(hand(), BIG_BLIND)!
    expect(legal.canFold).toBe(true)
    expect(legal.canCheck).toBe(false)
    expect(legal.callAmount).toBe(10)
  })

  it('can raise: at least a big blind more, at most everything', () => {
    const legal = getLegalActions(hand(), BIG_BLIND)!
    expect(legal.canRaise).toBe(true)
    expect(legal.minRaiseTo).toBe(40)
    expect(legal.maxRaiseTo).toBe(1000)
  })
})

describe('getLegalActions: nothing to call', () => {
  it('the big blind may check when the small blind just called', () => {
    const legal = getLegalActions(hand({ toAct: 1, bets: [20, 20], stacks: [980, 980] }), BIG_BLIND)!
    expect(legal.canCheck).toBe(true)
    expect(legal.callAmount).toBe(0)
    expect(legal.minRaiseTo).toBe(40)
  })

  it('first to act on the flop with no bets: can check, min bet is a big blind', () => {
    const legal = getLegalActions(
      hand({ phase: 'flop', toAct: 1, bets: [0, 0], stacks: [900, 900], pot: 200 }),
      BIG_BLIND,
    )!
    expect(legal.canCheck).toBe(true)
    expect(legal.callAmount).toBe(0)
    expect(legal.minRaiseTo).toBe(20)
    expect(legal.maxRaiseTo).toBe(900)
  })
})

describe('getLegalActions: short stacks', () => {
  it('a call is capped at what the player has', () => {
    const legal = getLegalActions(hand({ bets: [0, 100], stacks: [50, 800] }), BIG_BLIND)!
    expect(legal.callAmount).toBe(50)
    expect(legal.canCheck).toBe(false)
  })

  it('cannot bet more than the opponent can call', () => {
    const legal = getLegalActions(hand({ bets: [0, 0], stacks: [500, 100] }), BIG_BLIND)!
    expect(legal.maxRaiseTo).toBe(100)
    expect(legal.canRaise).toBe(true)
  })

  it('cannot raise when the opponent is already all-in', () => {
    const legal = getLegalActions(hand({ bets: [0, 100], stacks: [500, 0] }), BIG_BLIND)!
    expect(legal.callAmount).toBe(100)
    expect(legal.canRaise).toBe(false)
  })

  it('the minimum raise never goes above the maximum (all-in for less)', () => {
    const legal = getLegalActions(hand({ bets: [0, 0], stacks: [15, 900] }), BIG_BLIND)!
    expect(legal.minRaiseTo).toBe(15)
    expect(legal.maxRaiseTo).toBe(15)
  })
})
