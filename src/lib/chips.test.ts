import { describe, expect, it } from 'vitest'
import { chipsFor, DENOMINATIONS, MAX_CHIPS_PER_STACK, visibleCount } from './chips'

function total(amount: number) {
  return chipsFor(amount).reduce((sum, pile) => sum + pile.value * pile.count, 0)
}

describe('chipsFor', () => {
  it('has no chips for nothing', () => {
    expect(chipsFor(0)).toEqual([])
  })

  it('uses a single chip when the amount matches one', () => {
    expect(chipsFor(25)).toEqual([{ value: 25, count: 1 }])
  })

  it('makes the blinds out of 10s', () => {
    expect(chipsFor(10)).toEqual([{ value: 10, count: 1 }])
    expect(chipsFor(20)).toEqual([{ value: 10, count: 2 }])
  })

  it('uses the biggest chips first', () => {
    expect(chipsFor(1265)).toEqual([
      { value: 1000, count: 1 },
      { value: 100, count: 2 },
      { value: 25, count: 2 },
      { value: 10, count: 1 },
      { value: 5, count: 1 },
    ])
  })

  it('always adds up to exactly the amount', () => {
    for (let amount = 0; amount <= 2500; amount++) {
      expect(total(amount)).toBe(amount)
    }
  })

  it('only uses real denominations', () => {
    for (const { value } of chipsFor(1987)) {
      expect(DENOMINATIONS).toContain(value)
    }
  })

  it('ignores negative or fractional amounts safely', () => {
    expect(chipsFor(-5)).toEqual([])
    expect(chipsFor(7.9)).toEqual([
      { value: 5, count: 1 },
      { value: 1, count: 2 },
    ])
  })
})

describe('visibleCount', () => {
  it('draws every chip in a short pile', () => {
    expect(visibleCount(3)).toBe(3)
  })

  it('stops growing a tall pile', () => {
    expect(visibleCount(50)).toBe(MAX_CHIPS_PER_STACK)
  })
})
