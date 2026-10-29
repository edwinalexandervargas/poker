import { describe, expect, it } from 'vitest'
import { DEAL_STEP_SECONDS, dealPlan, SHUFFLE_SECONDS } from './deal'

const step = (n: number) => SHUFFLE_SECONDS + n * DEAL_STEP_SECONDS

describe('dealPlan', () => {
  it('heads-up: the player after the button first, then the button, then around again', () => {
    const { delays } = dealPlan(0, [true, true])
    expect(delays[1]).toEqual([step(0), step(2)])
    expect(delays[0]).toEqual([step(1), step(3)])
  })

  it('goes around a full table, starting after the button', () => {
    const { delays } = dealPlan(2, [true, true, true, true])
    // order: 3, 0, 1, 2, then 3, 0, 1, 2 again
    expect(delays[3]).toEqual([step(0), step(4)])
    expect(delays[2]).toEqual([step(3), step(7)])
  })

  it('skips seats that are not dealt in', () => {
    const { delays } = dealPlan(0, [true, false, true, false, true])
    expect(delays[1]).toBeUndefined()
    expect(delays[2]).toEqual([step(0), step(3)])
  })

  it('gives every card a different moment, none before the shuffle ends', () => {
    const all = Object.values(dealPlan(5, Array(8).fill(true))).flatMap((d) =>
      Object.values(d).flat(),
    )
    expect(new Set(all).size).toBe(16)
    for (const delay of all) expect(delay).toBeGreaterThanOrEqual(SHUFFLE_SECONDS)
  })
})
