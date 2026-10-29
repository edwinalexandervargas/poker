// Who's up and who's down tonight. Pure: no React, no Firebase.

import type { Seat } from './types.js'

export interface StandingInput {
  name: string
  seat: Seat
  /** Chips right now (as recorded when the last hand ended). */
  stack: number
  /** Times they bought back in. Missing means never. */
  rebuys?: number
}

export interface Standing {
  name: string
  seat: Seat
  stack: number
  /** Everything they've put on the table: the first buy-in plus every rebuy. */
  boughtIn: number
  /** stack minus boughtIn: positive is up, negative is down. */
  net: number
}

/**
 * Each player's result for the night, best first. Everyone bought in for `startingStack`,
 * and again for every rebuy, so that's what their current chips are measured against.
 */
export function standings(
  players: readonly StandingInput[],
  startingStack: number,
): Standing[] {
  return players
    .map((p) => {
      const boughtIn = startingStack * (1 + (p.rebuys ?? 0))
      return {
        name: p.name,
        seat: p.seat,
        stack: p.stack,
        boughtIn,
        net: p.stack - boughtIn,
      }
    })
    .sort((a, b) => b.net - a.net || a.seat - b.seat)
}
