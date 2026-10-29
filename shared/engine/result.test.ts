import { headsUp, type HeadsUpFixture } from './testHand.js'
import { describe, expect, it } from 'vitest'
import { applyAction } from './apply.js'
import type { HandState } from './hand.js'
import { resolveShowdown } from './showdown.js'
import type { Card } from './types.js'

const BIG_BLIND = 20
const dryBoard: Card[] = ['2c', '7d', '9h', 'Js', '3d']
const tieBoard: Card[] = ['Ts', 'Js', 'Qs', 'Ks', 'As']

function showdownHand(overrides: Partial<HeadsUpFixture> = {}): HandState {
  return headsUp({
    handNumber: 1,
    phase: 'showdown',
    button: 0,
    toAct: null,
    stacks: [900, 900],
    bets: [0, 0],
    pot: 200,
    actionsThisRound: 0,
    community: dryBoard,
    holeCards: [
      ['As', 'Ad'],
      ['Kh', 'Qc'],
    ],
    deck: [],
    ...overrides,
  } as HeadsUpFixture)
}

// Seat 0 is the small blind and about to act, as right after startHand.
function preflopHand(overrides: Partial<HeadsUpFixture> = {}): HandState {
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

describe('result: a fold', () => {
  it('records who won and how much they were awarded', () => {
    const next = applyAction(preflopHand(), { type: 'fold' }, BIG_BLIND)
    expect(next.result).toEqual({
      reason: 'fold',
      winners: [1],
      payouts: [0, 30],
      handName: null,
      pots: [{ amount: 30, winners: [1] }],
    })
  })

  it('includes the pot from earlier rounds', () => {
    const next = applyAction(
      preflopHand({
        phase: 'turn',
        toAct: 1,
        bets: [50, 0],
        stacks: [800, 900],
        pot: 250,
      }),
      { type: 'fold' },
      BIG_BLIND,
    )
    expect(next.result?.winners).toEqual([0])
    expect(next.result?.payouts).toEqual([300, 0])
  })
})

describe('result: a showdown', () => {
  it('records the winner, the payout and the winning hand', () => {
    const next = resolveShowdown(showdownHand())
    expect(next.result).toEqual({
      reason: 'showdown',
      winners: [0],
      payouts: [200, 0],
      handName: "Pair, A's",
      pots: [{ amount: 200, winners: [0] }],
    })
  })

  it('works when seat 1 wins', () => {
    const next = resolveShowdown(
      showdownHand({
        holeCards: [
          ['Kh', 'Qc'],
          ['As', 'Ad'],
        ],
      }),
    )
    expect(next.result?.winners).toEqual([1])
    expect(next.result?.payouts).toEqual([0, 200])
  })

  it('a tie lists both seats and splits the payout', () => {
    const next = resolveShowdown(
      showdownHand({
        community: tieBoard,
        holeCards: [
          ['2c', '3d'],
          ['4h', '5c'],
        ],
      }),
    )
    expect(next.result?.winners).toEqual([0, 1])
    expect(next.result?.payouts).toEqual([100, 100])
  })

  it('an odd pot gives the extra chip to the player who is not the button', () => {
    // An odd pot needs dead money: a third player put in one 5-chip and folded.
    const tie = {
      community: tieBoard,
      stacks: [900, 900, 995],
      bets: [0, 0, 0],
      holeCards: [
        ['2c', '3d'],
        ['4h', '5c'],
        ['9d', '8d'],
      ] as Card[][],
      folded: [false, false, true],
      committed: [100, 100, 5],
      pot: 205,
    }
    // The odd chip goes to the first winner to the left of the button.
    expect(resolveShowdown(showdownHand({ ...tie, button: 0 })).result?.payouts).toEqual([
      100, 105, 0,
    ])
    expect(resolveShowdown(showdownHand({ ...tie, button: 1 })).result?.payouts).toEqual([
      105, 100, 0,
    ])
  })

  it('the payouts are exactly what each stack gained', () => {
    const before = showdownHand({
      community: tieBoard,
      holeCards: [
        ['2c', '3d'],
        ['4h', '5c'],
      ],
      pot: 333,
    })
    const next = resolveShowdown(before)
    expect(next.stacks[0]! - before.stacks[0]!).toBe(next.result!.payouts[0])
    expect(next.stacks[1]! - before.stacks[1]!).toBe(next.result!.payouts[1])
  })
})
