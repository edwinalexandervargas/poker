import { draw } from './deck.js'
import { firstToAct, getBlindSeats, otherSeat } from './seats.js'
import { settleBetting } from './street.js'
import type { Card, Phase, Seat } from './types.js'

// Anything per-player is a pair indexed by seat: stacks[0] is seat 0's chips.
export interface HandState {
  handNumber: number
  phase: Phase
  button: Seat
  /** Whose turn it is, or null when nobody is betting. */
  toAct: Seat | null
  /** Chips each player still holds, not counting what they've bet this round. */
  stacks: [number, number]
  /** Chips each player has put in during the current betting round. */
  bets: [number, number]
  /** Chips from finished betting rounds. */
  pot: number
  actionsThisRound: number
  community: Card[]
  /** Each player's two private cards. Only ever sent to that player. */
  holeCards: [Card[], Card[]]
  /** The cards still in the deck. Never sent to anyone. */
  deck: Card[]
}

export interface StartHandInput {
  handNumber: number
  button: Seat
  stacks: [number, number]
  smallBlind: number
  bigBlind: number
  /** Already shuffled. Passing it in keeps this function predictable and testable. */
  deck: readonly Card[]
}

/**
 * YOUR TURN: make the tests in hand.test.ts pass.  Run them with:  npm run test:watch
 *
 * Starting a hand means:
 *   1. Check the deck is big enough: 4 hole cards + 5 board cards = 9. If it isn't,
 *      throw a RangeError.
 *   2. Work out who posts which blind (you wrote getBlindSeats).
 *   3. Post the blinds: move chips from each blind's stack into their bet.
 *      A player can't post more than they have, so a short stack posts what is left.
 *   4. Deal 4 cards off the top (the `draw` function does this) as hole cards.
 *      Cards go out one at a time, starting with the player AFTER the button,
 *      then the button, then back again:  other, button, other, button.
 *   5. Return the new HandState: preflop, nothing on the board, empty pot, the
 *      first player to act (you wrote firstToAct), and the rest of the deck.
 *
 * Hint: write it in that order, and run the tests after each step. Several will stay
 * red until you reach the end, which is normal.
 */
export function startHand(input: StartHandInput): HandState {
  const { handNumber, button, stacks, smallBlind, bigBlind, deck } = input
  if (deck.length < 9) {
  throw new RangeError(`Need at least 9 cards to start a hand, got ${deck.length}`)
}
const blinds = getBlindSeats(button)
const bets: [number, number] = [0, 0]                 
const left: [number, number] = [stacks[0], stacks[1]] 

const smallPosted = Math.min(smallBlind, left[blinds.smallBlind])
bets[blinds.smallBlind] = smallPosted
left[blinds.smallBlind] = left[blinds.smallBlind] - smallPosted

const bigPosted = Math.min(bigBlind, left[blinds.bigBlind])
bets[blinds.bigBlind] = bigPosted 
left[blinds.bigBlind] = left[blinds.bigBlind] - bigPosted

const { drawn, rest } = draw(deck, 4)
const holeCards: [Card[], Card[]] = [[], []]
const order = [ otherSeat(button), button, otherSeat(button), button]
order.forEach((seat, i) => {
  holeCards[seat].push(drawn[i]!)
})
return settleBetting({
handNumber,
phase: 'preflop',
button,
toAct: firstToAct(button, 'preflop'),
stacks: left,
bets,
actionsThisRound: 0,
pot: 0,
community: [],
holeCards,
deck: rest,
})
}
