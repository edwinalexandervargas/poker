import { draw } from './deck.js'
import { blindSeats, firstToAct, nextSeat } from './ring.js'
import { settleBetting } from './street.js'
import type { Card, Phase, Seat } from './types.js'

/** One pot and who won it. A hand with all-ins can have several (a main pot and side pots). */
export interface PotResult {
  amount: number
  /** The seats that shared this pot. More than one means a split. */
  winners: Seat[]
}

/** How a finished hand ended. Filled in when the hand completes, absent while it is live. */
export interface HandResult {
  reason: 'fold' | 'showdown'
  /** Every seat that won chips from any pot. */
  winners: Seat[]
  /** Chips each seat was awarded, indexed by seat (0 for everyone who won nothing). */
  payouts: number[]
  /** The main pot winner's hand, like "Pair, A's". Null when the hand ended by a fold. */
  handName: string | null
  /** Each pot separately. One entry unless someone was all-in for less. */
  pots: PotResult[]
}

// Every per-player list is indexed by TABLE SEAT and has one entry per seat (up to 8).
// A seat that isn't playing this hand has no hole cards, is marked folded, and has 0 bet.
export interface HandState {
  handNumber: number
  phase: Phase
  button: Seat
  /** Whose turn it is, or null when nobody is betting. */
  toAct: Seat | null
  /** Chips each player still holds, not counting what they've bet this round. */
  stacks: number[]
  /** Chips each player has put in during the current betting round. */
  bets: number[]
  /** Chips each player has put in during the WHOLE hand. Side pots are built from this. */
  committed: number[]
  /** Out of this hand: folded, or never dealt in. */
  folded: boolean[]
  /**
   * Has acted since the last raise this round. A round is over when everyone who can still
   * bet has acted and matched the highest bet. A raise sets everyone else back to false.
   */
  acted: boolean[]
  /** Chips from finished betting rounds. */
  pot: number
  /** Set once the hand is complete. */
  result?: HandResult
  community: Card[]
  /** Each seat's two private cards (empty if not dealt in). Only ever sent to that player. */
  holeCards: Card[][]
  /** The cards still in the deck. Never sent to anyone. */
  deck: Card[]
}

export interface StartHandInput {
  handNumber: number
  button: Seat
  /** One entry per seat. Seats with 0 chips (empty or busted) are not dealt in. */
  stacks: readonly number[]
  smallBlind: number
  bigBlind: number
  /** Already shuffled. Passing it in keeps this function predictable and testable. */
  deck: readonly Card[]
}

/** Was this seat dealt into the hand? */
export function isDealtIn(hand: HandState, seat: Seat): boolean {
  return (hand.holeCards[seat]?.length ?? 0) > 0
}

/** Can this seat still bet: in the hand, not folded, and has chips behind. */
export function canAct(hand: HandState, seat: Seat): boolean {
  return !hand.folded[seat] && (hand.stacks[seat] ?? 0) > 0
}

export function startHand(input: StartHandInput): HandState {
  const { handNumber, button, stacks, smallBlind, bigBlind, deck } = input
  const count = stacks.length
  const dealtIn = stacks.map((chips) => chips > 0)
  const players = dealtIn.filter(Boolean).length

  if (players < 2) throw new Error('A hand needs at least two players with chips')
  if (!dealtIn[button]) throw new Error(`The button (seat ${button}) is not in the hand`)
  if (deck.length < players * 2 + 5) {
    throw new RangeError(
      `Need ${players * 2 + 5} cards to start a hand, got ${deck.length}`,
    )
  }

  const left = [...stacks]
  const bets = Array<number>(count).fill(0)
  const blinds = blindSeats(button, dealtIn)
  const post = (seat: Seat, amount: number) => {
    // A short stack posts whatever it has left.
    const posted = Math.min(amount, left[seat]!)
    bets[seat] = posted
    left[seat]! -= posted
  }
  post(blinds.smallBlind, smallBlind)
  post(blinds.bigBlind, bigBlind)

  // Deal one card at a time, starting after the button, twice around the table.
  const order: Seat[] = []
  let seat = button
  for (let i = 0; i < players; i++) {
    seat = nextSeat(seat, count, (s) => dealtIn[s] === true)!
    order.push(seat)
  }
  const { drawn, rest } = draw(deck, players * 2)
  const holeCards: Card[][] = Array.from({ length: count }, () => [])
  ;[...order, ...order].forEach((s, i) => holeCards[s]!.push(drawn[i]!))

  const folded = dealtIn.map((isIn) => !isIn)
  const canBet = left.map((chips, s) => dealtIn[s]! && chips > 0)

  return settleBetting({
    handNumber,
    phase: 'preflop',
    button,
    toAct: firstToAct(button, 'preflop', dealtIn, canBet),
    stacks: left,
    bets,
    committed: [...bets],
    folded,
    // Posting a blind is not "acting": the big blind still gets its turn (its "option").
    acted: Array<boolean>(count).fill(false),
    pot: 0,
    community: [],
    holeCards,
    deck: rest,
  })
}
