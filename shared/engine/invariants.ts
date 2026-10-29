// Things that must be true about EVERY hand, at EVERY moment, no matter what players do.
// Pure game logic: no React, no Firebase.
//
// A normal test checks one situation you thought of. A stress test plays thousands of
// random hands and uses this function after every move to catch situations nobody
// thought of. If a rule below is ever broken, the engine has a bug.

import type { HandState } from './hand.js'

/** How many board cards each phase must have. */
const BOARD_SIZE = { preflop: 0, flop: 3, turn: 4, river: 5, showdown: 5 } as const

/**
 * YOUR TURN: make the tests in invariants.test.ts pass.  Run them with:  npm run test:watch
 *
 * Return a list of plain-English problems found in `hand`. An empty list means the hand
 * is healthy. `totalChips` is how many chips existed when the game began.
 *
 * Check these seven things (the test names say what each one looks like):
 *
 *   1. Chips are conserved: both stacks + both bets + the pot add up to totalChips.
 *   2. Chip amounts are sane: every stack, bet and the pot is a whole number, 0 or more.
 *   3. All 52 cards are accounted for: deck + both hole-card lists + the board hold exactly
 *      52 cards, with none appearing twice.
 *   4. The board matches the phase: use BOARD_SIZE above. ('complete' can have any size,
 *      because a fold can end a hand on any street.)
 *   5. Nobody is to act at showdown or complete, and somebody IS to act in every betting phase.
 *   6. A player to act has chips: the player whose turn it is must have a stack above 0.
 *      (A player with no chips left is all-in and cannot be asked to bet.)
 *   7. Every player has exactly two hole cards.
 *
 * Push a short string for each broken rule, for example  `chips: expected 2000, got 1990`
 * (the exact words are yours, the tests only check that something was reported).
 *
 * Hints: Number.isInteger(x) checks for whole numbers. new Set(list).size counts
 * distinct items. hand.phase in BOARD_SIZE-style lookups: BOARD_SIZE[hand.phase] only
 * works for phases that have an entry, so check `hand.phase in BOARD_SIZE` first.
 */
export function findProblems(hand: HandState, totalChips: number): string[] {
  const problems: string[] = []

  const chips = hand.stacks[0] + hand.stacks[1] + hand.bets[0] + hand.bets[1] + hand.pot
  if (chips !== totalChips) {
    problems.push(`chips: expected ${totalChips}, got ${chips}`)
  }
  const amounts = [hand.stacks[0], hand.stacks[1], hand.bets[0], hand.bets[1], hand.pot]
  for (const amount of amounts) {
    if (!Number.isInteger(amount) || amount < 0) {
      problems.push(`bad chip amount: ${amount}`)
    }
  }

  const cards = [
  ...hand.deck,
  ...hand.holeCards[0],
  ...hand.holeCards[1],
  ...hand.community,
]
if (cards.length !== 52) {
  problems.push(`cards: expected 52, found ${cards.length}`)
}
if (new Set(cards).size !== cards.length) {
  problems.push('cards: a card appears twice')
}
if (hand.phase in BOARD_SIZE) {
  const expected = BOARD_SIZE[hand.phase as keyof typeof BOARD_SIZE]
  if (hand.community.length !== expected) {
    problems.push(
      `board: ${hand.phase} should have ${expected} cards, has ${hand.community.length}`,
    )
  }
}

const betting =
  hand.phase === 'preflop' ||
  hand.phase === 'flop' ||
  hand.phase === 'turn' ||
  hand.phase === 'river'

if (betting && hand.toAct === null) {
  problems.push(`turn: nobody to act in ${hand.phase}`)
}
if (!betting && hand.toAct !== null) {
  problems.push(`turn: seat ${hand.toAct} is to act in ${hand.phase}`)
}
if (hand.toAct !== null && hand.stacks[hand.toAct] === 0) {
  problems.push(`turn: seat ${hand.toAct} is to act with no chips`)
}
  return problems
}
