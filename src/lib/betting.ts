import { getLegalActions } from '@shared/engine/actions'
import type { HandState } from '@shared/engine'
import type { TableState } from '@/lib/fakeTable'

// Betting numbers for the action bar.
//
// The screen does not keep its own copy of the rules. It asks the shared engine what is
// legal (the same function the server uses to check a move), so the buttons can never
// offer something the server will refuse. The server still has the final say.

export interface BettingOptions {
  /** Chips needed to match the opponent's bet (capped by my stack). */
  toCall: number
  canCheck: boolean
  /** Raising is possible at all (false when the opponent is all-in, for example). */
  canRaise: boolean
  /** Smallest and largest legal "raise to" totals. */
  minRaiseTo: number
  maxRaiseTo: number
  /** "Raise to" totals for the quick buttons, already clamped to [min, max]. */
  halfPotRaiseTo: number
  potRaiseTo: number
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export function getBettingOptions(table: TableState): BettingOptions {
  const me = table.seats[table.mySeat]
  const opp = table.seats[table.mySeat === 0 ? 1 : 0]

  // Describe the table to the engine as if it were my turn. (The action bar is greyed out
  // when it is not, but it still shows sensible numbers.)
  const forEngine: HandState = {
    handNumber: 0,
    phase: table.phase,
    button: table.seats[0].isDealer ? 0 : 1,
    toAct: table.mySeat,
    stacks: [table.seats[0].stack, table.seats[1].stack],
    bets: [table.seats[0].bet, table.seats[1].bet],
    pot: table.pot,
    actionsThisRound: 0,
    community: [],
    holeCards: [[], []],
    deck: [],
  }
  const legal = getLegalActions(forEngine, table.bigBlind)!

  // Pot-sized raise = match the bet, then bet the size of the pot after matching.
  const totalPot = table.pot + me.bet + opp.bet
  const potAfterCall = totalPot + legal.callAmount
  const raiseToForFraction = (fraction: number) =>
    clamp(
      me.bet + legal.callAmount + Math.round(potAfterCall * fraction),
      legal.minRaiseTo,
      legal.maxRaiseTo,
    )

  return {
    toCall: legal.callAmount,
    canCheck: legal.canCheck,
    canRaise: legal.canRaise,
    minRaiseTo: legal.minRaiseTo,
    maxRaiseTo: legal.maxRaiseTo,
    halfPotRaiseTo: raiseToForFraction(0.5),
    potRaiseTo: raiseToForFraction(1),
  }
}
