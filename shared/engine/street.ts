// Betting rounds and streets: when a round of betting is over, and what happens next.
// Pure game logic: no React, no Firebase.

import { draw } from './deck.js'
import type { HandState } from './hand.js'
import { firstToAct } from './seats.js'
import type { Phase } from './types.js'

/**
 * YOUR TURN (part 1): make the isRoundOver tests in street.test.ts pass.
 *
 * A betting round is over when BOTH players have had a turn AND the betting has settled.
 *
 *   both have acted   actionsThisRound is at least 2
 *   settled           EITHER the two bets are equal,
 *                     OR the player with the smaller bet has no chips left
 *                     (they are all-in for less, so nobody can bet any more)
 *
 * Why "at least 2"? Preflop the small blind can call and the bets are equal (20 and 20),
 * but the big blind has not had their turn yet (their "option" to raise).
 */
export function isRoundOver(hand: HandState): boolean {
const bothActed = hand.actionsThisRound >= 2
  const equalBets = hand.bets[0] === hand.bets[1]

  const [b0, b1] = hand.bets
  const seat0AllInShort = b0 < b1 && hand.stacks[0] === 0
  const seat1AllInShort = b1 < b0 && hand.stacks[1] === 0

  const settled = equalBets || seat0AllInShort || seat1AllInShort
  return bothActed && settled
}

// What comes next after each phase, and how many cards are dealt to the board.
const NEXT: Partial<Record<Phase, { phase: Phase; cards: number }>> = {
  preflop: { phase: 'flop', cards: 3 },
  flop: { phase: 'turn', cards: 1 },
  turn: { phase: 'river', cards: 1 },
  river: { phase: 'showdown', cards: 0 },
}

/**
 * YOUR TURN (part 2): make the advanceStreet tests in street.test.ts pass.
 *
 * Call this when a betting round is over. Return a NEW HandState where:
 *
 *   1. Bets are collected. The chips BOTH players have matched go into the pot:
 *        matched = the smaller of the two bets
 *        pot     = old pot + matched * 2
 *      Any extra a player bet that the other couldn't match goes back to that player's
 *      stack (stack + bet - matched). Then both bets are [0, 0].
 *   2. The phase moves to the next one, using NEXT above. If the phase has no entry in
 *      NEXT (showdown, complete, waiting), throw an Error.
 *   3. Deal that many cards off the top of the deck onto the community cards
 *      (the `draw` function does this). Community cards add up across streets.
 *   4. actionsThisRound goes back to 0.
 *   5. toAct is the first player to act in the new phase (you wrote firstToAct;
 *      it gives null for showdown).
 *
 * Never change the hand that was passed in.
 *
 * Not in this exercise: if a player is all-in, nobody can bet, so the board should be
 * dealt all the way out. We'll add that later. For now: one street at a time.
 */
export function advanceStreet(hand: HandState): boolean {
  const matched = Math.min(hand.bets[0], hand.bets[1])
  const pot = hand.pot + matched * 2
  const stacks: [number, number] = [
  hand.stacks[0] + hand.bets[0] - matched,
  hand.stacks[1] + hand.bets[1] - matched,
]
  const step = NEXT[hand.phase]
  if (!step) {
   throw new Error(`Cannot advance from ${hand.phase}`)
}

const { drawn, rest } = draw(hand.deck, step.cards)
return {
  ...hand,
  phase: step.phase,
  pot,
  stacks,
  bets: [0, 0],
  actionsThisRound: 0,
  community: [...hand.community, ...drawn],
  deck: rest,
  toAct: firstToAct(hand.button, step.phase),
}
}
