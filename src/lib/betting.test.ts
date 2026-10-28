import { describe, expect, it } from 'vitest'
import { getBettingOptions } from './betting'
import { fakeTable, type TableState } from './fakeTable'

describe('getBettingOptions', () => {
  it('facing a 40 bet: call 40, cannot check, min raise to 80', () => {
    const o = getBettingOptions(fakeTable)
    expect(o.toCall).toBe(40)
    expect(o.canCheck).toBe(false)
    expect(o.minRaiseTo).toBe(80)
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
      seats: [fakeTable.seats[0], { ...fakeTable.seats[1], bet: 0 }],
    }
    const o = getBettingOptions(table)
    expect(o.canCheck).toBe(true)
    expect(o.toCall).toBe(0)
    expect(o.minRaiseTo).toBe(20)
  })

  it('never lets a raise exceed my stack', () => {
    const table: TableState = {
      ...fakeTable,
      seats: [{ ...fakeTable.seats[0], stack: 50 }, fakeTable.seats[1]],
    }
    const o = getBettingOptions(table)
    expect(o.maxRaiseTo).toBe(50)
    expect(o.potRaiseTo).toBeLessThanOrEqual(50)
    expect(o.minRaiseTo).toBeLessThanOrEqual(50)
  })
})
