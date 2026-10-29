// Side pots: splitting the chips when players are all-in for different amounts.
// Pure logic: no React, no Firebase.
//
// Example: A is all-in for 100, B for 300, C has 500 and calls everything.
//   Main pot:    100 from each of A, B, C = 300.  A, B and C can win it.
//   Side pot 1:  200 more from each of B, C = 400.  Only B and C can win it
//                (A had no more chips, so A can't win chips A never matched).
//   C's last 200 was never called, so it was already returned before the showdown.

import { CHIP_UNIT, type Seat } from './types.js'

export interface Pot {
  amount: number
  /** Seats that put in enough to win this pot and haven't folded. */
  eligible: Seat[]
}

/**
 * Builds the pots from how much each seat put in over the whole hand.
 *
 * Walk up through the different amounts the remaining players put in ("levels"). Each level
 * makes one pot: every player, folded or not, adds what they put in between the previous
 * level and this one. Folded players' chips stay in (they're "dead money") but they can't win.
 */
export function buildPots(
  committed: readonly number[],
  folded: readonly boolean[],
): Pot[] {
  const levels = [
    ...new Set(committed.filter((chips, seat) => !folded[seat] && chips > 0)),
  ].sort((a, b) => a - b)

  const pots: Pot[] = []
  let previous = 0
  levels.forEach((level, i) => {
    const isLast = i === levels.length - 1
    let amount = 0
    committed.forEach((chips) => {
      // The last pot also sweeps up anything above the top level (a folded player who had
      // put in more than anyone left), so no chip is ever lost.
      const upTo = isLast ? chips : Math.min(chips, level)
      amount += Math.max(0, upTo - previous)
    })
    const eligible = committed.flatMap((chips, seat) =>
      !folded[seat] && chips >= level ? [seat] : [],
    )
    if (amount > 0) pots.push({ amount, eligible })
    previous = level
  })
  return pots
}

/**
 * Splits `amount` evenly between `winners`, in whole chips of CHIP_UNIT. Chips that don't
 * divide evenly go one at a time to the winners closest to the left of the button (the usual
 * casino rule). Anything smaller than a chip (never happens when every bet is a multiple of
 * CHIP_UNIT) goes to the first of them, so no amount is ever lost.
 */
export function splitPot(
  amount: number,
  winners: readonly Seat[],
  button: Seat,
  seatCount: number,
): Map<Seat, number> {
  const chips = Math.floor(amount / CHIP_UNIT)
  const loose = amount - chips * CHIP_UNIT
  const share = Math.floor(chips / winners.length) * CHIP_UNIT
  let leftover = chips % winners.length
  const byDistance = [...winners].sort(
    (a, b) =>
      ((a - button + seatCount) % seatCount || seatCount) -
      ((b - button + seatCount) % seatCount || seatCount),
  )
  const result = new Map<Seat, number>()
  byDistance.forEach((seat, i) => {
    result.set(seat, share + (leftover > 0 ? CHIP_UNIT : 0) + (i === 0 ? loose : 0))
    leftover--
  })
  return result
}
