// Converting hands to and from the shape Firestore can store.
// Pure logic: no React, no Firebase.
//
// Firestore refuses arrays inside arrays, and the engine's hole cards are a list of lists:
//   [['As', 'Ad'], ['Kh', 'Qc'], [], ...]
// So before saving we turn that into a map keyed by seat ("seat0", "seat1"...), and turn
// it back on loading.

import type { HandState } from './hand.js'
import type { PublicHandState } from './publicState.js'
import type { Card } from './types.js'

/** One list of cards per seat, as a map instead of a list of lists. */
export type SeatCards = Record<string, Card[]>

export type StoredHand = Omit<HandState, 'holeCards'> & { holeCards: SeatCards }
export type StoredPublicHand = Omit<PublicHandState, 'shown'> & {
  shown: SeatCards | null
}

function packCards(cards: readonly Card[][]): SeatCards {
  return Object.fromEntries(cards.map((list, seat) => [`seat${seat}`, [...list]]))
}

function unpackCards(cards: SeatCards, seatCount: number): Card[][] {
  return Array.from({ length: seatCount }, (_, seat) => [...(cards[`seat${seat}`] ?? [])])
}

export function packHand(hand: HandState): StoredHand {
  return { ...hand, holeCards: packCards(hand.holeCards) }
}

export function unpackHand(stored: StoredHand): HandState {
  return { ...stored, holeCards: unpackCards(stored.holeCards, stored.stacks.length) }
}

export function packPublic(view: PublicHandState): StoredPublicHand {
  return { ...view, shown: view.shown ? packCards(view.shown) : null }
}

export function unpackPublic(stored: StoredPublicHand): PublicHandState {
  return {
    ...stored,
    shown: stored.shown ? unpackCards(stored.shown, stored.stacks.length) : null,
  }
}
