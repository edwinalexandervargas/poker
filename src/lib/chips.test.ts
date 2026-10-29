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

  it('adds up to exactly the amount for every multiple of 5', () => {
    for (let amount = 0; amount <= 2500; amount += 5) {
      expect(total(amount)).toBe(amount)
    }
  })

  it('there is no 1-chip: the smallest chip is a 5', () => {
    expect(DENOMINATIONS.at(-1)).toBe(5)
  })

  it('only uses real denominations', () => {
    for (const { value } of chipsFor(1985)) {
      expect(DENOMINATIONS).toContain(value)
    }
  })

  it('ignores negative or fractional amounts safely', () => {
    expect(chipsFor(-5)).toEqual([])
    // 7.9 rounds down to 7: one 5-chip, and the 2 left over is too small to draw
    expect(chipsFor(7.9)).toEqual([{ value: 5, count: 1 }])
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
