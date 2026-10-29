// Applying one player's move to a hand.
// Pure game logic: no React, no Firebase. Cloud Functions will call this when a
// player acts, after the engine has decided the move is legal.

import { getLegalActions } from './actions.js'
import type { HandState } from './hand.js'
import { otherSeat } from './seats.js'
import type { Action } from './types.js'
import { settleBetting } from './street.js'

/**
 * YOUR TURN: make the tests in apply.test.ts pass.  Run them with:  npm run test:watch
 *
 * Return a NEW HandState with the move applied. Never change the one passed in.
 * (Tip: copy the pairs first, like  const stacks: [number, number] = [hand.stacks[0], hand.stacks[1]]
 *  and return  { ...hand, stacks, bets, toAct: ... }  to keep every other field as it was.)
 *
 * First, ask getLegalActions what is allowed, and throw an Error if nobody is to act.
 * Then, for each kind of move:
 *
 *   check  Only legal when canCheck is true (otherwise throw an Error).
 *          Nothing changes except the turn passes to the other player.
 *
 *   call   Throw an Error if there is nothing to call (callAmount is 0).
 *          Move callAmount chips from my stack into my bet. Turn passes.
 *
 *   raise  Throw an Error unless canRaise is true AND the amount is between
 *          minRaiseTo and maxRaiseTo. `amount` is my TOTAL bet this round, so only the
 *          difference (amount - my current bet) leaves my stack. Turn passes.
 *
 *   fold   The other player wins everything: the pot plus both bets go onto THEIR
 *          stack. Then bets are [0, 0], the pot is 0, the phase is 'complete' and
 *          toAct is null.
 *
 * Not in this exercise: noticing that a betting round is over, or dealing the flop.
 * That is the next exercise. For now a call just passes the turn.
 */
export function applyAction(
  hand: HandState,
  action: Action,
  bigBlind: number,
): HandState {
  const legal = getLegalActions(hand, bigBlind)
  if (legal === null || hand.toAct === null) {
    throw new Error('Nobody to act')
  }
  const me = hand.toAct
  const opp = otherSeat(me)

  const stacks: [number, number] = [hand.stacks[0], hand.stacks[1]]
  const bets: [number, number] = [hand.bets[0], hand.bets[1]]

  switch (action.type) {
    case 'check': {
      if (!legal.canCheck) {
        throw new Error('Cannot check: there is a bet to call')
      }
      return settleBetting({
        ...hand,
        toAct: opp,
        actionsThisRound: hand.actionsThisRound + 1,
      })
    }

    case 'call': {
      if (legal.callAmount === 0) {
        throw new Error('Nothing to call')
      }
      stacks[me] -= legal.callAmount
      bets[me] += legal.callAmount
      return settleBetting({
        ...hand,
        stacks,
        bets,
        toAct: opp,
        actionsThisRound: hand.actionsThisRound + 1,
      })
    }

    case 'raise': {
      if (
        !legal.canRaise ||
        action.amount < legal.minRaiseTo ||
        action.amount > legal.maxRaiseTo
      ) {
        throw new Error(
          `Raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`,
        )
      }
      stacks[me] -= action.amount - bets[me]
      bets[me] = action.amount
      return settleBetting({
        ...hand,
        stacks,
        bets,
        toAct: opp,
        actionsThisRound: hand.actionsThisRound + 1,
      })
    }

    case 'fold': {
      const won = hand.pot + bets[0] + bets[1]
      stacks[opp] += won
      return {
        ...hand,
        phase: 'complete',
        toAct: null,
        stacks,
        bets: [0, 0],
        pot: 0,
        result: {
          reason: 'fold',
          winners: [opp],
          payouts: opp === 0 ? [won, 0] : [0, won],
          handName: null,
        },
      }
    }
  }
}
