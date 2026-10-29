// When each card of a new hand leaves the deck.
// Pure: no React, no Firebase.

import type { Seat } from '@shared/engine'

/** The deck shuffles for this long before the first card is dealt. */
export const SHUFFLE_SECONDS = 1

/** Time between one card leaving the deck and the next. */
export const DEAL_STEP_SECONDS = 0.25

export interface DealPlan {
  /** delays[seat][n]: seconds after the hand appears until that seat's nth card leaves the deck. */
  delays: [[number, number], [number, number]]
}

/**
 * Cards go out one at a time, starting with the player AFTER the button, then the button,
 * then around again. (The engine deals in the same order.)
 */
export function dealPlan(button: Seat): DealPlan {
  const other: Seat = button === 0 ? 1 : 0
  const order = [other, button, other, button]

  const delays: DealPlan['delays'] = [
    [0, 0],
    [0, 0],
  ]
  const dealt = [0, 0]
  order.forEach((seat, i) => {
    delays[seat][dealt[seat]!] = SHUFFLE_SECONDS + i * DEAL_STEP_SECONDS
    dealt[seat]!++
  })
  return { delays }
}
