// Pure game types. No React, no Firebase: this folder is imported by the
// client, by Cloud Functions, and by Vitest.

export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'T',
  'J',
  'Q',
  'K',
  'A',
] as const
export const SUITS = ['s', 'h', 'd', 'c'] as const

export type Rank = (typeof RANKS)[number]
export type Suit = (typeof SUITS)[number]

/** Two-character card code such as "As", "Td", "2c". Matches pokersolver's format. */
export type Card = `${Rank}${Suit}`

export type Phase =
  'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'complete'

/** A seat at the table, 0 to MAX_SEATS - 1. Every per-player list in a hand is indexed by it. */
export type Seat = number

/** The most players one table can seat. */
export const MAX_SEATS = 8

/** Everything a player can do on their turn. Raise carries the total bet size. */
export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; amount: number }
