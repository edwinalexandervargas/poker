// When each card of a new hand leaves the deck.
// Pure: no React, no Firebase.

import { nextSeat } from '@shared/engine/ring'
import type { Seat } from '@shared/engine'

/** The deck shuffles for this long before the first card is dealt. */
export const SHUFFLE_SECONDS = 1

/** Time between one card leaving the deck and the next. */
export const DEAL_STEP_SECONDS = 0.18

export interface DealPlan {
  /** delays[seat]: seconds until that seat's first and second card leave the deck. */
  delays: Partial<Record<Seat, [number, number]>>
}

/**
 * Cards go out one at a time, starting with the player AFTER the button, around the
 * table, then around again. (The engine deals in the same order.)
 * `dealtIn[seat]` is true for players in this hand.
 */
export function dealPlan(button: Seat, dealtIn: readonly boolean[]): DealPlan {
  const order: Seat[] = []
  let seat = button
  const players = dealtIn.filter(Boolean).length
  for (let i = 0; i < players; i++) {
    seat = nextSeat(seat, dealtIn.length, (s) => dealtIn[s] === true) ?? seat
    order.push(seat)
  }

  const delays: DealPlan['delays'] = {}
  ;[...order, ...order].forEach((s, i) => {
    const at = SHUFFLE_SECONDS + i * DEAL_STEP_SECONDS
    const mine = delays[s]
    delays[s] = mine ? [mine[0], at] : [at, at]
  })
  return { delays }
}
