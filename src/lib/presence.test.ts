import { describe, expect, it } from 'vitest'
import { AWAY_AFTER_MS, isAway } from './presence'

describe('isAway', () => {
  it('is not away when they checked in a moment ago', () => {
    expect(isAway({ lastSeen: 100_000 }, 105_000)).toBe(false)
  })

  it('is not away right up to the limit', () => {
    expect(isAway({ lastSeen: 100_000 }, 100_000 + AWAY_AFTER_MS)).toBe(false)
  })

  it('is away once they have been silent for longer than the limit', () => {
    expect(isAway({ lastSeen: 100_000 }, 100_000 + AWAY_AFTER_MS + 1)).toBe(true)
  })

  it('is not away when they have never checked in (we do not know yet)', () => {
    expect(isAway({}, 999_999_999)).toBe(false)
  })
})
