import { getLegalActions } from '@shared/engine/actions'
import type { HandState } from '@shared/engine'
import { CHIP_UNIT } from '@shared/engine/types'
import { seatAt, type TableState } from '@/lib/fakeTable'

// Betting numbers for the action bar.
//
// The screen does not keep its own copy of the rules. It asks the shared engine what is
// legal (the same function the server uses to check a move), so the buttons can never
// offer something the server will refuse. The server still has the final say.

export interface BettingOptions {
  /** Chips needed to match the biggest bet (capped by my stack). */
  toCall: number
  canCheck: boolean
  /** Raising is possible at all (false when everyone else is all-in, for example). */
  canRaise: boolean
  /** Smallest and largest legal "raise to" totals. */
  minRaiseTo: number
  maxRaiseTo: number
  /** "Raise to" totals for the quick buttons, already clamped to [min, max]. */
  halfPotRaiseTo: number
  potRaiseTo: number
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

/** Rounds to the nearest whole chip (5): bets go up in 5s. */
const toChip = (n: number) => Math.round(n / CHIP_UNIT) * CHIP_UNIT

export function getBettingOptions(table: TableState): BettingOptions {
  const me = seatAt(table, table.mySeat)!
  const seatCount = Math.max(...table.seats.map((s) => s.seat)) + 1
  const list = <T>(pick: (s: TableState['seats'][number]) => T, empty: T) =>
    Array.from({ length: seatCount }, (_, seat) => {
      const s = seatAt(table, seat)
      return s ? pick(s) : empty
    })

  // Describe the table to the engine as if it were my turn. (The action bar is greyed out
  // when it is not, but it still shows sensible numbers.) Only the fields the betting rules
  // read matter here.
  const forEngine: HandState = {
    handNumber: 0,
    phase: table.phase,
    button: table.seats.find((s) => s.isDealer)?.seat ?? 0,
    toAct: table.mySeat,
    stacks: list((s) => s.stack, 0),
    bets: list((s) => s.bet, 0),
    committed: list((s) => s.bet, 0),
    folded: list((s) => !s.inHand && s.seat !== table.mySeat, true),
    acted: list(() => false, false),
    pot: table.pot,
    community: [],
    holeCards: list(() => [], []),
    deck: [],
  }
  const legal = getLegalActions(forEngine, table.bigBlind)!

  // Pot-sized raise = match the bet, then bet the size of the pot after matching.
  const totalPot = table.pot + table.seats.reduce((sum, s) => sum + s.bet, 0)
  const potAfterCall = totalPot + legal.callAmount
  const raiseToForFraction = (fraction: number) =>
    clamp(
      toChip(me.bet + legal.callAmount + potAfterCall * fraction),
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

/**
 * Moves a bet by `delta` chips and keeps it legal: snapped to a whole 5-chip, and inside
 * [min, max]. Reaching max is always allowed even when it isn't a multiple of 5 (all-in).
 */
export function stepBet(value: number, delta: number, min: number, max: number): number {
  const next = toChip(value + delta)
  if (next >= max) return max
  if (next <= min) return min
  return next
}
