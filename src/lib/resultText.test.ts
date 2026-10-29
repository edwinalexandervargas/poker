import { describe, expect, it } from 'vitest'
import type { HandResult } from '@shared/engine'
import { describeResult } from './resultText'

const names = ['Alice', 'Bob', 'Cara']

describe('describeResult', () => {
  it('says "You win" with the hand when I win a showdown', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0],
      payouts: [200, 0],
      pots: [{ amount: 200, winners: [0] }],
      handName: "Pair, A's",
    }
    expect(describeResult(result, 0, names)).toBe("You win 200 with Pair, A's")
  })

  it('uses the opponent name when they win a showdown', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [1],
      payouts: [0, 200],
      pots: [{ amount: 200, winners: [1] }],
      handName: 'Flush, Ah High',
    }
    expect(describeResult(result, 0, names)).toBe('Bob wins 200 with Flush, Ah High')
  })

  it('a hand that ends with everyone folding says so', () => {
    const theyFold: HandResult = {
      reason: 'fold',
      winners: [0],
      payouts: [30, 0],
      pots: [{ amount: 30, winners: [0] }],
      handName: null,
    }
    expect(describeResult(theyFold, 0, names)).toBe('You win 30 (everyone else folded)')
    const iFold: HandResult = {
      reason: 'fold',
      winners: [1],
      payouts: [0, 30],
      pots: [{ amount: 30, winners: [1] }],
      handName: null,
    }
    expect(describeResult(iFold, 0, names)).toBe('Bob wins 30 (everyone else folded)')
  })

  it('shows an even split as "each"', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1],
      payouts: [100, 100],
      pots: [{ amount: 200, winners: [0, 1] }],
      handName: 'Royal Flush',
    }
    expect(describeResult(result, 0, names)).toBe('Split pot: 100 each with Royal Flush')
  })

  it('shows an uneven split (odd pot) with each amount', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1],
      payouts: [100, 101],
      pots: [{ amount: 201, winners: [0, 1] }],
      handName: null,
    }
    expect(describeResult(result, 0, names)).toBe('Split pot: You get 100, Bob gets 101')
  })

  it('describes each pot when there are side pots', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1],
      payouts: [300, 800, 0],
      handName: "Pair, A's",
      pots: [
        { amount: 300, winners: [0] },
        { amount: 800, winners: [1] },
      ],
    }
    expect(describeResult(result, 2, names)).toBe(
      "Main pot 300: Alice (Pair, A's) · Side pot 800: Bob",
    )
  })

  it('three-way split of one pot', () => {
    const result: HandResult = {
      reason: 'showdown',
      winners: [0, 1, 2],
      payouts: [100, 100, 100],
      handName: 'Straight',
      pots: [{ amount: 300, winners: [0, 1, 2] }],
    }
    expect(describeResult(result, 0, names)).toBe('Split pot: 100 each with Straight')
  })
})
