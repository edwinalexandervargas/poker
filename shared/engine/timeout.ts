// What happens when a player runs out of time.
// Pure game logic: no React, no Firebase. The server's claimTimeout function calls this.

import { getLegalActions } from './actions.js'
import type { HandState } from './hand.js'
import type { Action } from './types.js'

/**
 * YOUR TURN: make the tests in timeout.test.ts pass.  Run them with:  npm run test:watch
 *
 * Return the move to play for the player whose time ran out:
 *
 *   - If they are allowed to check (nothing to call), return { type: 'check' }.
 *     Running out of time shouldn't cost chips when it's free to stay in.
 *   - Otherwise return { type: 'fold' }.
 *
 * If nobody is to act, throw an Error.
 *
 * Hint: getLegalActions(hand, bigBlind) already tells you whether the player can check,
 * and it returns null when nobody is to act.
 */
export function timeoutAction(hand: HandState, bigBlind: number): Action {
  const legal = getLegalActions(hand, bigBlind)
  if (legal === null) {
    throw new Error('Nobody to act')
  }
  return legal.canCheck ? { type: 'check' } : { type: 'fold' }
}
