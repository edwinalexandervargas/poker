// The countdown for the player on the clock.
// Pure: no React, no Firebase.
//
// The server decides the deadline using ITS clock. A phone's clock can be minutes off, so
// instead of comparing the deadline to the phone's time, we measure how far apart the two
// clocks are at the moment the update arrives (`clockOffset`) and correct for it.

export interface TurnClock {
  /** When time runs out, by the server's clock (milliseconds). */
  deadline: number
  /** How long the turn was in total, for drawing the bar. */
  totalMs: number
  /** Server time minus this computer's time when the update arrived. */
  clockOffset: number
}

/** Reads the clock fields off the public hand document. Null when nobody is on the clock. */
export function turnClockFromDoc(
  data: Record<string, unknown> | undefined,
  now: number,
): TurnClock | null {
  if (!data) return null
  const { turnStartedAt, turnDeadline } = data
  if (typeof turnStartedAt !== 'number' || typeof turnDeadline !== 'number') return null
  return {
    deadline: turnDeadline,
    totalMs: turnDeadline - turnStartedAt,
    clockOffset: turnStartedAt - now,
  }
}

/** Milliseconds left on the clock, never below zero. `now` is this computer's time. */
export function msLeft(turn: TurnClock, now: number): number {
  return Math.max(0, turn.deadline - (now + turn.clockOffset))
}
