import { describe, expect, it } from 'vitest'
import { getBettingOptions, stepBet } from './betting'
import { fakeTable, type TableState } from './fakeTable'

describe('getBettingOptions', () => {
  it('facing a 40 bet: call 40, cannot check, min raise to 60 (the bet plus a big blind)', () => {
    const o = getBettingOptions(fakeTable)
    expect(o.toCall).toBe(40)
    expect(o.canCheck).toBe(false)
    expect(o.minRaiseTo).toBe(60)
    expect(o.maxRaiseTo).toBe(940) // my whole stack
  })

  it('pot-sized raise: match 40, then bet the pot after matching (120 + 40 + 40)', () => {
    // total pot 160, after calling 200, so raise to 0 + 40 + 200 = 240
    expect(getBettingOptions(fakeTable).potRaiseTo).toBe(240)
    expect(getBettingOptions(fakeTable).halfPotRaiseTo).toBe(140)
  })

  it('no bet to face: can check, min bet is the big blind', () => {
    const table: TableState = {
      ...fakeTable,
      seats: [fakeTable.seats[0]!, { ...fakeTable.seats[1]!, bet: 0 }],
    }
    const o = getBettingOptions(table)
    expect(o.canCheck).toBe(true)
    expect(o.toCall).toBe(0)
    expect(o.minRaiseTo).toBe(20)
  })

  it('never lets a raise exceed my stack', () => {
    const table: TableState = {
      ...fakeTable,
      seats: [{ ...fakeTable.seats[0]!, stack: 50 }, fakeTable.seats[1]!],
    }
    const o = getBettingOptions(table)
    expect(o.maxRaiseTo).toBe(50)
    expect(o.potRaiseTo).toBeLessThanOrEqual(50)
    expect(o.minRaiseTo).toBeLessThanOrEqual(50)
  })

  it('cannot bet more than the opponent can call', () => {
    // The opponent has a bet of 40 and only 60 behind, so 100 is the most they can have in.
    const table: TableState = {
      ...fakeTable,
      seats: [fakeTable.seats[0]!, { ...fakeTable.seats[1]!, stack: 60 }],
    }
    const o = getBettingOptions(table)
    expect(o.maxRaiseTo).toBe(100)
    expect(o.potRaiseTo).toBeLessThanOrEqual(100)
  })

  it('cannot raise when the opponent is already all-in', () => {
    const table: TableState = {
      ...fakeTable,
      seats: [fakeTable.seats[0]!, { ...fakeTable.seats[1]!, stack: 0 }],
    }
    const o = getBettingOptions(table)
    expect(o.canRaise).toBe(false)
    expect(o.toCall).toBe(40)
  })

  it('quick bets land on whole 5-chips, even with an odd-looking pot', () => {
    for (const pot of [115, 135, 245, 380]) {
      const o = getBettingOptions({ ...fakeTable, pot })
      expect(o.halfPotRaiseTo % 5).toBe(0)
      expect(o.potRaiseTo % 5).toBe(0)
    }
  })
})

describe('stepBet', () => {
  it('moves by 5', () => {
    expect(stepBet(60, 5, 40, 500)).toBe(65)
    expect(stepBet(60, -5, 40, 500)).toBe(55)
  })
  it('never goes below the minimum raise or above all-in', () => {
    expect(stepBet(40, -5, 40, 500)).toBe(40)
    expect(stepBet(500, 5, 40, 500)).toBe(500)
  })
  it('reaches an all-in that is not a multiple of 5', () => {
    expect(stepBet(935, 5, 40, 937)).toBe(937)
  })
  it('snaps an in-between value onto a 5', () => {
    expect(stepBet(62, 0, 40, 500)).toBe(60)
  })
})
