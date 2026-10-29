// Showdown: who has the best hand, and who gets the pot.
// Pure game logic: no React, no Firebase.

import pokersolver from 'pokersolver'
import type { HandState } from './hand.js'
import { otherSeat } from './seats.js'
import type { Card, Seat } from './types.js'

// pokersolver is an old CommonJS package. Importing its default export and picking
// Hand out of it works both in Vitest and in plain Node (Cloud Functions).
const { Hand } = pokersolver

/**
 * YOUR TURN (part 1): make the getWinners tests in showdown.test.ts pass.
 *
 * Each player's best hand is the best five of their 2 hole cards + the 5 board cards.
 * You don't have to work that out: the pokersolver library does it.
 *
 *   Hand.solve(cards)      takes a list of card codes like ['As', 'Kd', ...] and
 *                          returns that player's best hand
 *   Hand.winners(hands)    takes a list of those hands and returns the winning one(s)
 *                          (two when it is a tie)
 *
 * Steps:
 *   1. Solve a hand for EACH seat, using that seat's hole cards plus the community
 *      cards. Keep the results in a list where position 0 is seat 0 and position 1
 *      is seat 1.
 *   2. Ask Hand.winners for the winners among them.
 *   3. Return the SEATS whose hand is among the winners, in order: [0], [1], or [0, 1].
 *
 * Hint for step 3: `winners.includes(solved[seat])` tells you whether a seat won.
 */
export function getWinners(
  holeCards: [Card[], Card[]],
  community: readonly Card[],
): Seat[] {
  const solved = holeCards.map((cards) => Hand.solve([...cards, ...community]))
  const winners = Hand.winners(solved)
  const seats: Seat[] = []
  if (winners.includes(solved[0]!)) seats.push(0)
  if (winners.includes(solved[1]!)) seats.push(1)
  return seats
}

/**
 * YOUR TURN (part 2): make the resolveShowdown tests in showdown.test.ts pass.
 *
 * Call this when the phase is 'showdown'. Throw an Error for any other phase.
 * Return a NEW HandState where:
 *
 *   - One winner:  the whole pot is added to the winner's stack.
 *   - A tie:       the pot is split in half, one half to each stack. If the pot is odd,
 *                  one chip is left over: it goes to the player who is NOT the button.
 *   - Then the pot is 0, the phase is 'complete', and toAct is null.
 *
 * Never change the hand that was passed in.
 *
 * Hint for the tie: Math.floor(pot / 2) is each player's half. What's left over is
 * pot minus both halves.
 */
export function resolveShowdown(hand: HandState): HandState {
  if (hand.phase !== 'showdown') {
  throw new Error(`No showdown in phase ${hand.phase}`)
}
const winners = getWinners(hand.holeCards, hand.community)
const stacks: [number, number] = [hand.stacks[0], hand.stacks[1]]

if (winners.length === 1) {
  stacks[winners[0]!] += hand.pot
} else {
  const half = Math.floor(hand.pot / 2)
   stacks[0] += half
  stacks[1] += half
  stacks[otherSeat(hand.button)] += hand.pot - half * 2
}
  return { ...hand, phase: 'complete', toAct: null, stacks, pot: 0 }
}
