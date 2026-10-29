import { describe, expect, it } from 'vitest'
import type { HandResult } from '@shared/engine'
import { describeResult } from './resultText'

const names: [string, string] = ['Alice', 'Bob']

describe('describeResult', () => {
  it('says "You win" with the hand when I win a showdown', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0],
      payouts: [200, 0],
      handName: "Pair, A's",
    }
    expect(describeResult(result, 0, names)).toBe("You win 200 with Pair, A's")
  })

  it('uses the opponent name when they win a showdown', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [1],
      payouts: [0, 200],
      handName: 'Flush, Ah High',
    }
    expect(describeResult(result, 0, names)).toBe('Bob wins 200 with Flush, Ah High')
  })

  it('says who folded when the hand ends in a fold', () => {
    const theyFold: HandResult = {
      reason: 'fold',
      winners: [0],
      payouts: [30, 0],
      handName: null,
    }
    expect(describeResult(theyFold, 0, names)).toBe('You win 30 (Bob folded)')
    const iFold: HandResult = {
      reason: 'fold',
      winners: [1],
      payouts: [0, 30],
      handName: null,
    }
    expect(describeResult(iFold, 0, names)).toBe('Bob wins 30 (you folded)')
  })

  it('shows an even split as "each"', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1],
      payouts: [100, 100],
      handName: 'Royal Flush',
    }
    expect(describeResult(result, 0, names)).toBe('Split pot: 100 each with Royal Flush')
  })

  it('shows an uneven split (odd pot) with each amount', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1],
      payouts: [100, 101],
      handName: null,
    }
    expect(describeResult(result, 0, names)).toBe(
      'Split pot: Alice gets 100, Bob gets 101',
    )
  })
})
