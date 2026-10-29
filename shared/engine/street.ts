// Betting rounds and streets: when a round of betting is over, and what happens next.
// Pure game logic: no React, no Firebase.

import { draw } from './deck.js'
import { canAct, type HandState } from './hand.js'
import { firstToAct } from './ring.js'
import type { Phase } from './types.js'

/**
 * A betting round is over when every player who can still bet (not folded, not all-in)
 * has acted since the last raise AND has matched the highest bet.
 *
 * "Has acted" matters preflop: the big blind's bet already matches when everyone calls,
 * but the big blind still gets a turn (its "option" to raise).
 */
export function isRoundOver(hand: HandState): boolean {
  const highest = Math.max(...hand.bets)
  return hand.stacks.every(
    (_, seat) => !canAct(hand, seat) || (hand.acted[seat] && hand.bets[seat] === highest),
  )
}

/**
 * Can anybody still bet? No when at most one player has chips left AND that player has
 * nothing to call. Everyone else is all-in (or folded), so the board just runs out.
 */
export function bettingClosed(hand: HandState): boolean {
  const highest = Math.max(...hand.bets)
  const bettors = hand.stacks.flatMap((_, seat) => (canAct(hand, seat) ? [seat] : []))
  if (bettors.length === 0) return true
  return bettors.length === 1 && hand.bets[bettors[0]!] === highest
}

// What comes next after each phase, and how many cards are dealt to the board.
const NEXT: Partial<Record<Phase, { phase: Phase; cards: number }>> = {
  preflop: { phase: 'flop', cards: 3 },
  flop: { phase: 'turn', cards: 1 },
  turn: { phase: 'river', cards: 1 },
  river: { phase: 'showdown', cards: 0 },
}

/**
 * Ends a betting round:
 *   1. An uncalled bet goes back. If the biggest bet is larger than every other bet,
 *      nobody matched the extra, so it returns to its owner's stack.
 *   2. All bets go into the pot.
 *   3. The next street's cards are dealt, and the first player to act is worked out.
 */
export function advanceStreet(hand: HandState): HandState {
  const step = NEXT[hand.phase]
  if (!step) throw new Error(`Cannot advance from ${hand.phase}`)

  const stacks = [...hand.stacks]
  const bets = [...hand.bets]
  const committed = [...hand.committed]

  const highest = Math.max(...bets)
  const top = bets.indexOf(highest)
  const second = Math.max(0, ...bets.filter((_, seat) => seat !== top))
  if (highest > second) {
    const refund = highest - second
    stacks[top]! += refund
    bets[top]! -= refund
    committed[top]! -= refund
  }

  const pot = hand.pot + bets.reduce((a, b) => a + b, 0)
  const { drawn, rest } = draw(hand.deck, step.cards)
  const next: HandState = {
    ...hand,
    phase: step.phase,
    pot,
    stacks,
    committed,
    bets: bets.map(() => 0),
    acted: bets.map(() => false),
    community: [...hand.community, ...drawn],
    deck: rest,
  }
  // After the flop, "first after the button" only looks at players still in the hand.
  // (A seat that was never dealt in is marked folded too.)
  const stillIn = next.folded.map((out) => !out)
  const bettors = stacks.map((_, seat) => canAct(next, seat))
  return { ...next, toAct: firstToAct(hand.button, step.phase, stillIn, bettors) }
}

/**
 * Call after anything that could end the betting. If the round is over, or nobody can bet
 * any more, move to the next street, and keep dealing until the river if everyone is all-in.
 */
export function settleBetting(hand: HandState): HandState {
  if (!isRoundOver(hand) && !bettingClosed(hand)) return hand

  let next = advanceStreet(hand)
  while (next.phase !== 'showdown' && bettingClosed(next)) {
    next = advanceStreet(next)
  }
  return next
}
