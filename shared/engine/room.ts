// Pure room logic: codes, names, seats. No React, no Firebase.
// The Cloud Functions use these to validate input; the client uses them to tidy input.

import { secureRandomInt, type RandomInt } from './deck.js'
import { MAX_SEATS, type Seat } from './types.js'

/** No 0/O, 1/I/L, so a code read aloud or typed from a text can't be misread. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const ROOM_CODE_LENGTH = 5
export const MAX_PLAYER_NAME_LENGTH = 20

export interface RoomConfig {
  startingStack: number
  smallBlind: number
  bigBlind: number
  /** Show each player a bar with their rough chance of winning. Chosen by the host. */
  showStrength?: boolean
}

export const DEFAULT_ROOM_CONFIG: RoomConfig = {
  startingStack: 1000,
  smallBlind: 10,
  bigBlind: 20,
}

export type RoomStatus = 'waiting' | 'playing' | 'finished'

/** rooms/{code} */
export interface RoomDoc {
  code: string
  status: RoomStatus
  hostUid: string
  config: RoomConfig
}

/** rooms/{code}/players/{uid} */
export interface PlayerDoc {
  name: string
  seat: Seat
  stack: number
  connected: boolean
  /** The server's clock (ms) when this player's screen last checked in. Missing until then. */
  lastSeen?: number
  /** The server's clock when this player's screen was hidden or closed. Null once they're back. */
  leftAt?: number | null
  /** How many times this player has bought back in after busting. Missing means never. */
  rebuys?: number
  /** When they last sent a chat message (server clock, ms), for the cooldown. */
  lastChatAt?: number
  /** Their latest emoji reaction and when it was sent (server clock, ms). */
  reaction?: { emoji: string; at: number }
}

/** A random room code such as "K7MQ2". */
export function generateRoomCode(randomInt: RandomInt = secureRandomInt): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]
  }
  return code
}

/**
 * Tidies what a person typed ("k7 mq2" becomes "K7MQ2"). Returns null if the result
 * isn't a possible room code.
 */
export function normalizeRoomCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== ROOM_CODE_LENGTH) return null
  for (const char of code) {
    if (!ROOM_CODE_ALPHABET.includes(char)) return null
  }
  return code
}

/** Trims and collapses spaces. Returns null if empty, too long, or not a string. */
export function cleanPlayerName(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const name = input.trim().replace(/\s+/g, ' ')
  if (name.length === 0 || name.length > MAX_PLAYER_NAME_LENGTH) return null
  return name
}

/** The lowest free seat, or null if all MAX_SEATS are taken. */
export function pickFreeSeat(taken: readonly Seat[]): Seat | null {
  for (let seat = 0; seat < MAX_SEATS; seat++) {
    if (!taken.includes(seat)) return seat
  }
  return null
}

/**
 * Each seat's chips for the next hand, as a list of MAX_SEATS entries (0 for an empty seat
 * or a busted player). Built from the player documents, so someone who sat down during the
 * last hand is included.
 */
export function stacksBySeat(
  players: readonly Pick<PlayerDoc, 'seat' | 'stack'>[],
): number[] {
  const stacks = Array<number>(MAX_SEATS).fill(0)
  for (const player of players) stacks[player.seat] = player.stack
  return stacks
}

/**
 * Can this player buy back in? Only once they have no chips left: a rebuy is for getting
 * back into the game, not for topping up a short stack. `playerStack` is the chips on their
 * player document, which the server updates when each hand ends.
 */
export function canRebuy(playerStack: number, status: RoomStatus): boolean {
  return playerStack === 0 && status !== 'waiting'
}
