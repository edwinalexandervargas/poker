// What is the player whose turn it is allowed to do?
// Pure game logic: no React, no Firebase. The UI will use this to decide which
// buttons to show, and Cloud Functions will use it to reject illegal moves.

import type { HandState } from './hand.js'
import { otherSeat } from './seats.js'

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
 * YOUR TURN: make the tests in actions.test.ts pass.  Run them with:  npm run test:watch
 *
 * Return null if nobody is to act. Otherwise work out, for the player to act ("me")
 * and the other player ("opp"):
 *
 *   highest     = the larger of the two bets this round
 *   toCall      = highest - my bet
 *   callAmount  = toCall, but never more than my stack (all-in for less is allowed)
 *   canCheck    = nothing to call
 *   myTotal     = my bet + my stack        (the most I could have in this round)
 *   oppTotal    = opp bet + opp stack
 *   maxRaiseTo  = the smaller of myTotal and oppTotal
 *                 (you can't bet chips your opponent has no way to call)
 *   canRaise    = maxRaiseTo is bigger than highest
 *   minRaiseTo  = highest + bigBlind, but never above maxRaiseTo
 *                 (simplified rule: a raise must add at least one big blind)
 */
export function getLegalActions(hand: HandState, bigBlind: number): LegalActions | null {
  if (hand.toAct === null) { return null}

  const me = hand.toAct
  const opp = otherSeat(me)
  const highest = Math.max(hand.bets[0], hand.bets[1])
  const toCall = highest - hand.bets[me]

  const myTotal = hand.bets[me] + hand.stacks[me]
  const oppTotal = hand.bets[opp] + hand.stacks[opp]
  const maxRaiseTo = Math.min(myTotal, oppTotal)

  return {
    canFold: true,
    canCheck: toCall === 0,
    callAmount: Math.min(toCall, hand.stacks[me]),
    canRaise: maxRaiseTo > highest,
    minRaiseTo: Math.min(highest + bigBlind, maxRaiseTo),
    maxRaiseTo: maxRaiseTo
  }
}
