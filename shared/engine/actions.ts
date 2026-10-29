// What is the player whose turn it is allowed to do?
// Pure game logic: no React, no Firebase. The UI uses this to decide which buttons to show,
// and Cloud Functions use it to reject illegal moves.

import type { HandState } from './hand.js'

export interface LegalActions {
  /** Folding is always allowed on your turn. */
  canFold: boolean
  /** You may check only when you've already matched the highest bet. */
  canCheck: boolean
  /** Chips needed to call. 0 when you can check. Never more than you have. */
  callAmount: number
  canRaise: boolean
  /** Smallest legal raise, as the TOTAL bet you'd have in this round. */
  minRaiseTo: number
  /** Largest legal raise, as the TOTAL bet you'd have in this round. */
  maxRaiseTo: number
}

/**
 * Return null if nobody is to act. Otherwise:
 *
 *   highest     = the biggest bet on the table this round
 *   callAmount  = what I need to match it, but never more than my stack
 *   maxRaiseTo  = all my chips (bet + stack), but no more than the biggest total any
 *                 OTHER player still in the hand could match. Betting chips nobody can
 *                 call is pointless: they would just come back.
 *   canRaise    = maxRaiseTo is bigger than highest
 *   minRaiseTo  = highest + bigBlind, capped at maxRaiseTo
 *                 (simplified rule: a raise must add at least one big blind)
 */
export function getLegalActions(hand: HandState, bigBlind: number): LegalActions | null {
  if (hand.toAct === null) return null
  const me = hand.toAct

  const highest = Math.max(...hand.bets)
  const toCall = highest - hand.bets[me]!

  const myTotal = hand.bets[me]! + hand.stacks[me]!
  let biggestOpponent = 0
  hand.bets.forEach((bet, seat) => {
    if (seat !== me && !hand.folded[seat]) {
      biggestOpponent = Math.max(biggestOpponent, bet + hand.stacks[seat]!)
    }
  })
  const maxRaiseTo = Math.min(myTotal, biggestOpponent)

  return {
    canFold: true,
    canCheck: toCall === 0,
    callAmount: Math.min(toCall, hand.stacks[me]!),
    canRaise: maxRaiseTo > highest,
    minRaiseTo: Math.min(highest + bigBlind, maxRaiseTo),
    maxRaiseTo,
  }
}
