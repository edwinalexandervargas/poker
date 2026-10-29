import { describe, expect, it } from 'vitest'
import { DEAL_STEP_SECONDS, dealPlan, SHUFFLE_SECONDS } from './deal'

describe('dealPlan', () => {
  it('deals the player after the button first, then the button, then around again', () => {
    // Button on seat 0, so seat 1 gets the first card.
    const { delays } = dealPlan(0)
    expect(delays[1][0]).toBe(SHUFFLE_SECONDS)
    expect(delays[0][0]).toBe(SHUFFLE_SECONDS + DEAL_STEP_SECONDS)
    expect(delays[1][1]).toBe(SHUFFLE_SECONDS + 2 * DEAL_STEP_SECONDS)
    expect(delays[0][1]).toBe(SHUFFLE_SECONDS + 3 * DEAL_STEP_SECONDS)
  })

  it('swaps the order when the button is on seat 1', () => {
    const { delays } = dealPlan(1)
    expect(delays[0][0]).toBe(SHUFFLE_SECONDS)
    expect(delays[1][0]).toBe(SHUFFLE_SECONDS + DEAL_STEP_SECONDS)
  })

  it('never starts dealing before the shuffle is over', () => {
    for (const button of [0, 1] as const) {
      for (const seat of delays(button)) {
        for (const delay of seat) expect(delay).toBeGreaterThanOrEqual(SHUFFLE_SECONDS)
      }
    }
  })

  it('gives every card a different moment', () => {
    const all = dealPlan(0).delays.flat()
    expect(new Set(all).size).toBe(4)
  })
})

function delays(button: 0 | 1) {
  return dealPlan(button).delays
}
