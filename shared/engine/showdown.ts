// Showdown: who has the best hand, and who gets each pot.
// Pure game logic: no React, no Firebase.

import pokersolver from 'pokersolver'
import type { HandState, PotResult } from './hand.js'
import { buildPots, splitPot } from './pots.js'
import type { Card, Seat } from './types.js'

// pokersolver is an old CommonJS package. Importing its default export and picking
// Hand out of it works both in Vitest and in plain Node (Cloud Functions).
const { Hand } = pokersolver
type Hand = InstanceType<typeof Hand>

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
  const built = buildPots(hand.committed, hand.folded)
  const pots: PotResult[] = built.map((pot) => {
    const winners = getWinners(hand.holeCards, hand.community, pot.eligible)
    for (const [seat, chips] of splitPot(pot.amount, winners, hand.button, count)) {
      payouts[seat]! += chips
    }
    return { amount: pot.amount, winners }
  })

  const stacks = hand.stacks.map((chips, seat) => chips + payouts[seat]!)
  const winners = payouts.flatMap((chips, seat) => (chips > 0 ? [seat] : []))
  const mainWinner = pots[0]!.winners[0]!
  const solve = (seat: Seat) => Hand.solve([...hand.holeCards[seat]!, ...hand.community])
  const losers = built[0]!.eligible.filter((seat) => !pots[0]!.winners.includes(seat))
  const handName = describeWin(solve(mainWinner), losers.map(solve))

  return {
    ...hand,
    phase: 'complete',
    toAct: null,
    stacks,
    pot: 0,
    result: { reason: 'showdown', winners, payouts, handName, pots },
  }
}

/**
 * pokersolver's hand name, tidied for people: "Flush, Qd High" becomes "Flush, Q high"
 * (the suit letter adds nothing) and "A High" becomes "A high".
 */
export function handTitle(descr: string): string {
  return descr.replace(
    /\b(10|[2-9TJQKA])[shdc]? High$/,
    (_, rank: string) => `${rank === 'T' ? '10' : rank} high`,
  )
}

/** How many of the five cards make up the named hand. The rest are kickers. */
const MADE_CARDS: Record<string, number> = {
  'High Card': 1,
  Pair: 2,
  'Two Pair': 4,
  'Three of a Kind': 3,
  'Four of a Kind': 4,
}

/**
 * The winning hand's name, plus the kicker when that's what decided it. With A-A-K-Q on the
 * board, J-2 beats 8-7 even though both are "Pair, A's", so the banner says
 * "Pair, A's (J kicker)" instead of leaving people wondering why.
 */
export function describeWin(winner: Hand, losers: readonly Hand[]): string {
  const made = MADE_CARDS[winner.name]
  // The closest loser: same kind of hand, best of the rest.
  const sameKind = losers.filter((other) => other.name === winner.name)
  if (made === undefined || sameKind.length === 0) return handTitle(winner.descr)
  const closest = Hand.winners([...sameKind])[0]!
  const at = winner.cards.findIndex((card, i) => card.value !== closest.cards[i]?.value)
  if (at < made) return handTitle(winner.descr)
  const value = winner.cards[at]!.value
  return `${handTitle(winner.descr)} (${value === 'T' ? '10' : value} kicker)`
}
