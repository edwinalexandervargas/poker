import type { SeatState, TableState } from '@/lib/fakeTable'

// Heads-up betting numbers for the action bar.
//
// NOTE: this is a simplified, display-only version so the UI has something to show.
// The real rules (who can act, exact min-raise tracking, all-in edge cases) will live
// in shared/engine and be enforced by Cloud Functions. The UI must never be the referee.

export interface BettingOptions {
  /** Chips needed to match the opponent's bet (capped by my stack). */
  toCall: number
  canCheck: boolean
  /** Smallest legal "raise to" total, and the most I can put in (my whole stack). */
  minRaiseTo: number
  maxRaiseTo: number
  /** "Raise to" totals for the quick buttons, already clamped to [min, max]. */
  halfPotRaiseTo: number
  potRaiseTo: number
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export function getBettingOptions(table: TableState): BettingOptions {
  const me: SeatState = table.seats[table.mySeat]
  const opp: SeatState = table.seats[table.mySeat === 0 ? 1 : 0]

  const maxRaiseTo = me.bet + me.stack
  const toCall = Math.min(opp.bet - me.bet, me.stack)
  const canCheck = opp.bet <= me.bet

  // The smallest raise adds at least the size of the bet I'm facing (or a big blind).
  const increment = Math.max(table.bigBlind, opp.bet - me.bet)
  const minRaiseTo = Math.min(opp.bet + increment, maxRaiseTo)

  // Pot-sized raise = match the bet, then bet the size of the pot after matching.
  const totalPot = table.pot + me.bet + opp.bet
  const potAfterCall = totalPot + toCall
  const raiseToForFraction = (fraction: number) =>
    clamp(me.bet + toCall + Math.round(potAfterCall * fraction), minRaiseTo, maxRaiseTo)

  return {
    toCall,
    canCheck,
    minRaiseTo,
    maxRaiseTo,
    halfPotRaiseTo: raiseToForFraction(0.5),
    potRaiseTo: raiseToForFraction(1),
  }
}
