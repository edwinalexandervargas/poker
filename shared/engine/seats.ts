// Heads-up (two player) seating rules.
//
// YOUR TURN: make the tests in seats.test.ts pass by filling in these three functions.
//   Run them with:  npm run test:watch
//
// Remember the heads-up rules (they differ from a full table):
//   - The player with the dealer button posts the SMALL blind. The other posts the big blind.
//   - Preflop, the button acts first.
//   - On the flop, turn and river, the button acts LAST (so the other player acts first).

import type { Phase, Seat } from './types.js'

/** The seat that is not `seat`. */
export function otherSeat(seat: Seat): Seat {
  return seat === 0 ? 1 : 0
}

/** Who posts which blind, given who has the dealer button. */
export function getBlindSeats(button: Seat): { smallBlind: Seat; bigBlind: Seat } {
  return { smallBlind: button, bigBlind: otherSeat(button)}
}

/**
 * Who acts first in a betting round, or null if this phase has no betting
 * (waiting, showdown, complete).
 */
export function firstToAct(button: Seat, phase: Phase): Seat | null {
  if (phase === 'preflop') return button
if (phase === 'flop' || phase === 'turn' || phase === 'river') return otherSeat(button)
return null
}
