// Showdown: who has the best hand, and who gets each pot.
// Pure game logic: no React, no Firebase.

import pokersolver from 'pokersolver'
import type { HandState, PotResult } from './hand.js'
import { buildPots, splitPot } from './pots.js'
import type { Card, Seat } from './types.js'

// pokersolver is an old CommonJS package. Importing its default export and picking
// Hand out of it works both in Vitest and in plain Node (Cloud Functions).
const { Hand } = pokersolver

/**
 * The seats with the best hand among `contenders`, using each seat's hole cards plus the
 * board. More than one seat means a tie. Defaults to every seat that has cards.
 */
export function getWinners(
  holeCards: readonly Card[][],
  community: readonly Card[],
  contenders: readonly Seat[] = holeCards.flatMap((cards, seat) =>
    cards.length > 0 ? [seat] : [],
  ),
): Seat[] {
  const solved = contenders.map((seat) => Hand.solve([...holeCards[seat]!, ...community]))
  const best = Hand.winners(solved)
  return contenders.filter((_, i) => best.includes(solved[i]!))
}

/**
 * Pays every pot at showdown. Each pot goes to the best hand among the players eligible for
 * it (see pots.ts), split evenly on a tie.
 */
export function resolveShowdown(hand: HandState): HandState {
  if (hand.phase !== 'showdown') throw new Error(`No showdown in phase ${hand.phase}`)

  const count = hand.stacks.length
  const payouts = Array<number>(count).fill(0)
  const pots: PotResult[] = buildPots(hand.committed, hand.folded).map((pot) => {
    const winners = getWinners(hand.holeCards, hand.community, pot.eligible)
    for (const [seat, chips] of splitPot(pot.amount, winners, hand.button, count)) {
      payouts[seat]! += chips
    }
    return { amount: pot.amount, winners }
  })

  const stacks = hand.stacks.map((chips, seat) => chips + payouts[seat]!)
  const winners = payouts.flatMap((chips, seat) => (chips > 0 ? [seat] : []))
  const mainWinner = pots[0]!.winners[0]!
  const handName = Hand.solve([...hand.holeCards[mainWinner]!, ...hand.community]).descr

  return {
    ...hand,
    phase: 'complete',
    toAct: null,
    stacks,
    pot: 0,
    result: { reason: 'showdown', winners, payouts, handName, pots },
  }
}
