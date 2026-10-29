import { describe, expect, it } from 'vitest'
import { AWAY_AFTER_MS, LEFT_GRACE_MS, isAway, isGone } from './presence.js'

const NOW = 1_000_000

describe('isAway', () => {
  it('a recent check-in is not away', () => {
    expect(isAway({ lastSeen: NOW - 3000 }, NOW)).toBe(false)
  })
  it('long silence is away', () => {
    expect(isAway({ lastSeen: NOW - AWAY_AFTER_MS - 1 }, NOW)).toBe(true)
  })
  it('leaving the screen shows as away at once', () => {
    expect(isAway({ lastSeen: NOW - 1000, leftAt: NOW - 100 }, NOW)).toBe(true)
  })
  it('back on the screen (leftAt cleared) is not away', () => {
    expect(isAway({ lastSeen: NOW - 1000, leftAt: null }, NOW)).toBe(false)
  })
  it('never checked in: we do not know, so not away', () => {
    expect(isAway({}, NOW)).toBe(false)
  })
})

describe('isGone', () => {
  it('glancing away for a moment is not gone (the grace period)', () => {
    expect(isGone({ lastSeen: NOW - 1000, leftAt: NOW - 3000 }, NOW)).toBe(false)
  })
  it('left the screen longer than the grace period is gone', () => {
    expect(isGone({ lastSeen: NOW - 1000, leftAt: NOW - LEFT_GRACE_MS }, NOW)).toBe(true)
  })
  it('long silence is gone, even without a goodbye (closed laptop, lost signal)', () => {
    expect(isGone({ lastSeen: NOW - AWAY_AFTER_MS - 1 }, NOW)).toBe(true)
  })
  it('checking in normally is not gone', () => {
    expect(isGone({ lastSeen: NOW - 4000, leftAt: null }, NOW)).toBe(false)
  })
})
