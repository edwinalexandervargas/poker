// One player's turn, from "they sent a move" to "here is the new hand".
// Pure game logic: no React, no Firebase. The Cloud Function will call this.

import { applyAction } from './apply.js'
import type { HandState } from './hand.js'
import { resolveShowdown } from './showdown.js'
import type { Action, Seat } from './types.js'

export interface TurnResult {
  /** The hand after the move. If it reached showdown, the pot has already been paid. */
  state: HandState
  /** True when a showdown happened, so both players' hole cards may be shown. */
  reveal: boolean
}

/**
 * YOUR TURN: make the tests in playTurn.test.ts pass.  Run them with:  npm run test:watch
 *
 * `seat` is who is trying to act. (The server works that out from who is logged in.)
 *
 *   1. If it is not this seat's turn (state.toAct is not `seat`), throw an Error.
 *      This also covers a finished hand, where toAct is null.
 *   2. Apply the move with applyAction. If the move is illegal it throws by itself.
 *   3. If the new hand has reached the 'showdown' phase, settle it: return the hand
 *      after resolveShowdown, with reveal true.
 *   4. Otherwise return the new hand with reveal false. (A fold ends the hand with
 *      reveal false: nobody has to show their cards.)
 *
 * Never change the hand that was passed in.
 */
export function playTurn(
  state: HandState,
  seat: Seat,
  action: Action,
  bigBlind: number,
): TurnResult {
  if (state.toAct !== seat) {
    throw new Error('Not your turn')
  }

  const next = applyAction(state, action, bigBlind)

  if (next.phase === 'showdown') {
    return { state: resolveShowdown(next), reveal: true }
  }

  return { state: next, reveal: false }
}