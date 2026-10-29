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
