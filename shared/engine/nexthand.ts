// Moving from one hand to the next.
// Pure game logic: no React, no Firebase.

import { startHand, type HandState } from './hand.js'
import { nextSeat } from './ring.js'
import type { Card, Seat } from './types.js'

/**
 * The next hand's button: the next seat after the old button that has chips. (A busted
 * player's seat is skipped; a newcomer is dealt in as soon as they have chips.)
 */
export function nextButton(previousButton: Seat, stacks: readonly number[]): Seat | null {
  return nextSeat(previousButton, stacks.length, (s) => (stacks[s] ?? 0) > 0)
}

/**
 * The first state of the NEXT hand, or null if the game is over (fewer than two players
 * have chips). `stacks` defaults to how the last hand ended; the server passes its own
 * list instead, which includes anyone who sat down during the last hand.
 */
export function nextHand(
  previous: HandState,
  smallBlind: number,
  bigBlind: number,
  deck: readonly Card[],
  stacks: readonly number[] = previous.stacks,
): HandState | null {
  if (previous.phase !== 'complete') throw new Error('The previous hand is not finished')
  if (stacks.filter((chips) => chips > 0).length < 2) return null

  return startHand({
    handNumber: previous.handNumber + 1,
    button: nextButton(previous.button, stacks)!,
    stacks,
    smallBlind,
    bigBlind,
    deck,
  })
}
