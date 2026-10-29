// The version of a hand that every player at the table is allowed to see.
// Pure game logic: no React, no Firebase.
//
// The full HandState holds secrets: the deck and both players' hole cards. If those ever
// reach a browser, a player could read the deck or their opponent's cards from the network
// tab. So the server never publishes a HandState. It publishes this instead.

import type { HandResult, HandState } from './hand.js'
import type { Card, Phase, Seat } from './types.js'

export interface PublicHandState {
  handNumber: number
  phase: Phase
  button: Seat
  toAct: Seat | null
  stacks: [number, number]
  bets: [number, number]
  pot: number
  community: Card[]
  /** Both players' hole cards, but only once they are meant to be shown. Otherwise null. */
  shown: [Card[], Card[]] | null
  /** How the hand ended, once it is over. Null while it is still being played. */
  result: HandResult | null
}

/**
 * YOUR TURN: make the tests in publicState.test.ts pass.  Run them with:  npm run test:watch
 *
 * Build a PublicHandState from a full HandState:
 *   - Copy over the public fields (handNumber, phase, button, toAct, stacks, bets, pot,
 *     community).
 *   - NEVER include `deck` or `holeCards`.
 *   - `shown` is the hole cards when `reveal` is true (a showdown happened), and null
 *     when `reveal` is false (nobody sees the cards if someone folded).
 *
 * Why is `reveal` an input instead of being worked out from the phase? After a showdown the
 * server pays the pot and the phase becomes 'complete', which looks the same as a fold.
 * Only the server knows which one happened, so it tells this function.
 *
 * Build a fresh object with just the fields you want. Do NOT do { ...hand } and then try
 * to delete the secret ones: if a field is added to HandState later, it would leak.
 */
export function toPublicState(hand: HandState, reveal: boolean): PublicHandState {
  return {
    handNumber: hand.handNumber,
    phase: hand.phase,
    button: hand.button,
    toAct: hand.toAct,
    stacks: [hand.stacks[0], hand.stacks[1]],
    bets: [hand.bets[0], hand.bets[1]],
    pot: hand.pot,
    community: [...hand.community],
    shown: reveal ? [[...hand.holeCards[0]], [...hand.holeCards[1]]] : null,
    // Firestore refuses `undefined`, so a live hand has an explicit null here.
    result: hand.result ?? null,
  }
}
