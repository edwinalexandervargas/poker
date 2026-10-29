import { describe, expect, it } from 'vitest'
import { buildPots, splitPot } from './pots.js'

describe('buildPots', () => {
  it('everyone put in the same: one pot, everyone can win it', () => {
    expect(buildPots([100, 100, 100], [false, false, false])).toEqual([
      { amount: 300, eligible: [0, 1, 2] },
    ])
  })

  it('a short all-in makes a main pot and a side pot', () => {
    // A all-in for 100; B and C both put in 300
    expect(buildPots([100, 300, 300], [false, false, false])).toEqual([
      { amount: 300, eligible: [0, 1, 2] },
      { amount: 400, eligible: [1, 2] },
    ])
  })

  it('three different all-ins make three pots', () => {
    expect(buildPots([50, 200, 500, 500], [false, false, false, false])).toEqual([
      { amount: 200, eligible: [0, 1, 2, 3] }, // 50 x 4
      { amount: 450, eligible: [1, 2, 3] }, // 150 x 3
      { amount: 600, eligible: [2, 3] }, // 300 x 2
    ])
  })

  it('folded players add their chips but cannot win', () => {
    // seat 1 called 100 then folded
    expect(buildPots([300, 100, 300], [false, true, false])).toEqual([
      { amount: 700, eligible: [0, 2] },
    ])
  })

  it('a folded player who put in more than anyone left still loses every chip', () => {
    expect(buildPots([100, 400, 100], [false, true, false])).toEqual([
      { amount: 600, eligible: [0, 2] },
    ])
  })

  it('never loses or creates a chip', () => {
    const committed = [37, 250, 0, 999, 250, 12]
    const folded = [false, false, true, false, true, false]
    const total = buildPots(committed, folded).reduce((a, p) => a + p.amount, 0)
    expect(total).toBe(committed.reduce((a, b) => a + b, 0))
  })
})

describe('splitPot', () => {
  it('splits evenly', () => {
    expect(Object.fromEntries(splitPot(300, [0, 2], 1, 3))).toEqual({ 0: 150, 2: 150 })
  })

  it('the odd chip goes to the winner closest to the left of the button', () => {
    // button 3 of 6: seat 5 is two seats left of it, seat 1 is four
    expect(Object.fromEntries(splitPot(301, [1, 5], 3, 6))).toEqual({ 5: 151, 1: 150 })
  })

  it('the button itself is the LAST seat to get an odd chip', () => {
    expect(Object.fromEntries(splitPot(301, [0, 2], 0, 4))).toEqual({ 2: 151, 0: 150 })
  })

  it('three-way split with two odd chips', () => {
    expect(Object.fromEntries(splitPot(302, [0, 1, 2], 0, 3))).toEqual({
      1: 101,
      2: 101,
      0: 100,
    })
  })
})
