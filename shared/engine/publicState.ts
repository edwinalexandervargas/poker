// The version of a hand that every player at the table is allowed to see.
// Pure game logic: no React, no Firebase.
//
// The full HandState holds secrets: the deck and every player's hole cards. If those ever
// reach a browser, a player could read the deck or other players' cards from the network
// tab. So the server never publishes a HandState. It publishes this instead.

import { isDealtIn, type HandResult, type HandState } from './hand.js'
import type { Card, Phase, Seat } from './types.js'

export interface PublicHandState {
  handNumber: number
  phase: Phase
  button: Seat
  toAct: Seat | null
  stacks: number[]
  bets: number[]
  /** Which seats were dealt into this hand (so the table can draw their face-down cards). */
  dealtIn: boolean[]
  folded: boolean[]
  pot: number
  community: Card[]
  /**
   * After a showdown: the hole cards of every player who was still in at the end (folded
   * players' cards stay hidden, as at a real table). Otherwise null.
   */
  shown: Card[][] | null
  /** How the hand ended, once it is over. Null while it is still being played. */
  result: HandResult | null
}

/**
 * Build a fresh object with only the public fields. Never `{ ...hand }` minus the secrets:
 * a field added to HandState later would leak.
 */
export function toPublicState(hand: HandState, reveal: boolean): PublicHandState {
  return {
    handNumber: hand.handNumber,
    phase: hand.phase,
    button: hand.button,
    toAct: hand.toAct,
    stacks: [...hand.stacks],
    bets: [...hand.bets],
    dealtIn: hand.stacks.map((_, seat) => isDealtIn(hand, seat)),
    folded: [...hand.folded],
    pot: hand.pot,
    community: [...hand.community],
    shown: reveal
      ? hand.holeCards.map((cards, seat) => (hand.folded[seat] ? [] : [...cards]))
      : null,
    // Firestore refuses `undefined`, so a live hand has an explicit null here.
    result: hand.result ?? null,
  }
}
