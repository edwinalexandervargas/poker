import { describe, expect, it } from 'vitest'
import { msLeft, turnClockFromDoc } from './turnClock'

// The server started the turn at 1,000,000 and gave 30 seconds. This computer's clock
// said 400 when the update arrived, so it is a long way off the server's.
const doc = { turnStartedAt: 1_000_000, turnDeadline: 1_030_000 }

describe('turnClockFromDoc', () => {
  it('reads the deadline, the total time and the clock difference', () => {
    expect(turnClockFromDoc(doc, 400)).toEqual({
      deadline: 1_030_000,
      totalMs: 30_000,
      clockOffset: 999_600,
    })
  })

  it('is null when nobody is on the clock (a finished hand)', () => {
    expect(
      turnClockFromDoc({ turnStartedAt: 1_000_000, turnDeadline: null }, 400),
    ).toBeNull()
  })

  it('is null when the document has no clock fields or does not exist', () => {
    expect(turnClockFromDoc({}, 400)).toBeNull()
    expect(turnClockFromDoc(undefined, 400)).toBeNull()
  })
})

describe('msLeft', () => {
  const turn = turnClockFromDoc(doc, 400)!

  it('has the full time left when the update has just arrived', () => {
    expect(msLeft(turn, 400)).toBe(30_000)
  })

  it('counts down as this computer’s own clock moves, however far off it is', () => {
    expect(msLeft(turn, 10_400)).toBe(20_000)
    expect(msLeft(turn, 29_900)).toBe(500)
  })

  it('never goes below zero', () => {
    expect(msLeft(turn, 60_000)).toBe(0)
  })
})
