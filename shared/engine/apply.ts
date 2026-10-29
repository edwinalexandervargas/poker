// Applying one player's move to a hand.
// Pure game logic: no React, no Firebase. Cloud Functions call this when a player acts,
// after the engine has decided the move is legal.

import { getLegalActions } from './actions.js'
import { canAct, type HandState } from './hand.js'
import { nextSeat } from './ring.js'
import { settleBetting } from './street.js'
import { CHIP_UNIT, type Action, type Seat } from './types.js'

/**
 * Return a NEW HandState with the move applied. Never changes the one passed in.
 *
 *   check  only when there is nothing to call
 *   call   match the highest bet (or go all-in for less)
 *   raise  `amount` is my TOTAL bet this round. Everyone else must act again.
 *   fold   I'm out. If only one player is left, they win everything at once.
 *
 * After the move the turn passes to the next player who can still bet, and
 * settleBetting deals the next street if the betting round is over.
 */
export function applyAction(
  hand: HandState,
  action: Action,
  bigBlind: number,
): HandState {
  const legal = getLegalActions(hand, bigBlind)
  if (legal === null || hand.toAct === null) throw new Error('Nobody to act')
  const me = hand.toAct

  const stacks = [...hand.stacks]
  const bets = [...hand.bets]
  const committed = [...hand.committed]
  const folded = [...hand.folded]
  let acted = [...hand.acted]

  const put = (chips: number) => {
    stacks[me]! -= chips
    bets[me]! += chips
    committed[me]! += chips
  }

  switch (action.type) {
    case 'check':
      if (!legal.canCheck) throw new Error('Cannot check: there is a bet to call')
      break
    case 'call':
      if (legal.callAmount === 0) throw new Error('Nothing to call')
      put(legal.callAmount)
      break
    case 'raise':
      if (
        !legal.canRaise ||
        action.amount < legal.minRaiseTo ||
        action.amount > legal.maxRaiseTo
      ) {
        throw new Error(
          `Raise must be between ${legal.minRaiseTo} and ${legal.maxRaiseTo}`,
        )
      }
      // Bets go up in whole chips of CHIP_UNIT. Going all-in is always allowed as it is.
      if (action.amount % CHIP_UNIT !== 0 && action.amount !== legal.maxRaiseTo) {
        throw new Error(`Bets go up in steps of ${CHIP_UNIT}`)
      }
      put(action.amount - bets[me]!)
      // A raise re-opens the betting: everyone else has to respond to it.
      acted = acted.map(() => false)
      break
    case 'fold':
      folded[me] = true
      break
  }
  acted[me] = true

  const next: HandState = { ...hand, stacks, bets, committed, folded, acted }

  // Everyone else folded: the last player wins the pot and all bets, no cards shown.
  const stillIn = folded.flatMap((out, seat) => (out ? [] : [seat]))
  if (stillIn.length === 1) return winByFold(next, stillIn[0]!)

  return settleBetting({
    ...next,
    toAct: nextSeat(me, stacks.length, (s: Seat) => canAct(next, s)),
  })
}

function winByFold(hand: HandState, winner: Seat): HandState {
  const won = hand.pot + hand.bets.reduce((a, b) => a + b, 0)
  const stacks = [...hand.stacks]
  stacks[winner]! += won
  const payouts = hand.stacks.map((_, seat) => (seat === winner ? won : 0))
  return {
    ...hand,
    phase: 'complete',
    toAct: null,
    stacks,
    bets: hand.bets.map(() => 0),
    pot: 0,
    result: {
      reason: 'fold',
      winners: [winner],
      payouts,
      handName: null,
      pots: [{ amount: won, winners: [winner] }],
    },
  }
}
