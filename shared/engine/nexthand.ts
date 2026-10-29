// Moving from one hand to the next.
// Pure game logic: no React, no Firebase.

import { startHand, type HandState } from './hand.js'
import { otherSeat } from './seats.js'
import type { Card } from './types.js'

/**
 * YOUR TURN: make the tests in nexthand.test.ts pass.  Run them with:  npm run test:watch
 *
 * Call this when a hand has finished (its phase is 'complete'). It returns the first
 * state of the NEXT hand, or null if the game is over.
 *
 *   1. If the previous hand's phase is not 'complete', throw an Error.
 *   2. If either player has no chips left, the game is over: return null.
 *   3. The button moves to the other seat each hand (you have a function for "the other seat").
 *   4. Start the new hand with startHand. It needs:
 *        handNumber   one more than the previous hand's
 *        button       the new button from step 3
 *        stacks       the chips each player finished with (all chips are in the stacks
 *                     now: a complete hand has no pot and no bets)
 *        smallBlind, bigBlind, deck   passed straight through from this function's inputs
 *
 * The deck is passed in (already shuffled) for the same reason as in startHand.
 */
export function nextHand(
  previous: HandState,
  smallBlind: number,
  bigBlind: number,
  deck: readonly Card[],
): HandState | null {
  if (previous.phase !== 'complete') {
    throw new Erorr('The previous hand is not finished')
  }
  if (previous.stacks[0] === 0 || previous.stacks[1] === 0) {
    return null
  }

  return startHand({
    handNumber: previous.handNumber + 1,
    button: otherSeat(previous.button),
    stacks: previous.stacks ,
    smallBlind,
    bigBlind,
    deck,
  })
}
