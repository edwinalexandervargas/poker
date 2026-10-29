// Seating for 2 to 8 players: who is next, who posts the blinds, who acts first.
// Pure game logic: no React, no Firebase.
//
// Every per-player list in a hand (stacks, bets, hole cards...) is indexed by table seat.
// Not every seat plays every hand: an empty seat, a busted player, or someone who sat down
// mid-hand is simply "not dealt in". These functions take a list saying who is.
//
// "Clockwise" means the next seat number, wrapping from the last seat back to 0. The `%`
// (remainder) operator does the wrapping: with 8 seats, (7 + 1) % 8 is 0.

import type { Phase, Seat } from './types.js'

/**
 * The next seat after `from` (clockwise, wrapping around) for which `ok(seat)` is true.
 * Never returns `from` itself. Null if nobody else qualifies.
 */
export function nextSeat(
  from: Seat,
  count: number,
  ok: (seat: Seat) => boolean,
): Seat | null {
  for (let step = 1; step < count; step++) {
    const seat = (from + step) % count
    if (ok(seat)) return seat
  }
  return null
}

function countTrue(list: readonly boolean[]): number {
  return list.filter(Boolean).length
}

/**
 * Who posts which blind. `dealtIn[seat]` is true for players in this hand.
 *
 *   3+ players: the next two players after the button post small and big.
 *   2 players (heads-up): the BUTTON posts the small blind, the other the big blind.
 *   That one exception is the standard rule, and it is why heads-up feels different.
 */
export function blindSeats(
  button: Seat,
  dealtIn: readonly boolean[],
): { smallBlind: Seat; bigBlind: Seat } {
  const count = dealtIn.length
  const isIn = (seat: Seat) => dealtIn[seat] === true
  if (countTrue(dealtIn) < 2) throw new Error('A hand needs at least two players')

  const smallBlind = countTrue(dealtIn) === 2 ? button : nextSeat(button, count, isIn)!
  const bigBlind = nextSeat(smallBlind, count, isIn)!
  return { smallBlind, bigBlind }
}

/**
 * Who acts first in a betting round, or null if nobody can (or the phase has no betting).
 *
 *   Preflop: the first player after the big blind.
 *   Flop, turn, river: the first player after the button.
 *
 * Heads-up needs no special case here: "after the big blind" is the button, and "after the
 * button" is the other player, which is exactly the heads-up rule.
 * `canAct[seat]` is false for anyone who can't bet: not dealt in, folded, or all-in.
 */
export function firstToAct(
  button: Seat,
  phase: Phase,
  dealtIn: readonly boolean[],
  canAct: readonly boolean[],
): Seat | null {
  if (phase !== 'preflop' && phase !== 'flop' && phase !== 'turn' && phase !== 'river') {
    return null
  }
  const count = dealtIn.length
  const after = phase === 'preflop' ? blindSeats(button, dealtIn).bigBlind : button
  const start = nextSeat(after, count, (s) => dealtIn[s] === true)
  if (start === null) return null
  if (canAct[start]) return start
  return nextSeat(start, count, (s) => canAct[s] === true)
}
