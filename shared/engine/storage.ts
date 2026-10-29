// Converting hands to and from the shape Firestore can store.
// Pure logic: no React, no Firebase.
//
// Firestore refuses arrays inside arrays, and the engine's hole cards are a pair of lists:
//   [['As', 'Ad'], ['Kh', 'Qc']]
// So before saving we turn that pair into a map keyed by seat, and turn it back on loading.

import type { HandState } from './hand.js'
import type { PublicHandState } from './publicState.js'
import type { Card } from './types.js'

/** One list of cards per seat, as a map instead of a pair. */
export interface SeatCards {
  seat0: Card[]
  seat1: Card[]
}

export type StoredHand = Omit<HandState, 'holeCards'> & { holeCards: SeatCards }
export type StoredPublicHand = Omit<PublicHandState, 'shown'> & {
  shown: SeatCards | null
}

function packCards(cards: [Card[], Card[]]): SeatCards {
  return { seat0: [...cards[0]], seat1: [...cards[1]] }
}

function unpackCards(cards: SeatCards): [Card[], Card[]] {
  return [[...cards.seat0], [...cards.seat1]]
}

export function packHand(hand: HandState): StoredHand {
  return { ...hand, holeCards: packCards(hand.holeCards) }
}

export function unpackHand(stored: StoredHand): HandState {
  return { ...stored, holeCards: unpackCards(stored.holeCards) }
}

export function packPublic(view: PublicHandState): StoredPublicHand {
  return { ...view, shown: view.shown ? packCards(view.shown) : null }
}

export function unpackPublic(stored: StoredPublicHand): PublicHandState {
  return { ...stored, shown: stored.shown ? unpackCards(stored.shown) : null }
}
