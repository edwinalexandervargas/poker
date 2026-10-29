import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  DEFAULT_ROOM_CONFIG,
  cleanPlayerName,
  createDeck,
  generateRoomCode,
  normalizeRoomCode,
  pickFreeSeat,
  shuffle,
  type PlayerDoc,
  type RoomDoc,
} from '../../shared/engine/index.js'

initializeApp()
const db = getFirestore()

// Every function follows the same shape: check who is asking, validate the input with
// the shared engine, then write with the Admin SDK (which bypasses the security rules,
// because clients are not allowed to write game data themselves).

interface RoomInput {
  name?: unknown
  code?: unknown
}

function requireUid(uid: string | undefined): string {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.')
  return uid
}

function requireName(input: unknown): string {
  const name = cleanPlayerName(input)
  if (!name) throw new HttpsError('invalid-argument', 'Enter a name (1-20 characters).')
  return name
}

/** Firestore's error when `create()` finds the document already exists. */
function isAlreadyExists(error: unknown): boolean {
  const code = (error as { code?: number | string }).code
  return code === 6 || code === 'already-exists'
}

/** Smoke test for the emulator setup. */
export const ping = onCall(() => {
  const deck = shuffle(createDeck())
  return { ok: true, deckSize: deck.length, time: new Date().toISOString() }
})

/** Makes a new table with the caller seated as the host in seat 0. */
export const createRoom = onCall<RoomInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const name = requireName(request.data?.name)

  // The room code is the document id. `create()` fails if that id is taken, so two
  // tables can never share a code. On a (rare) clash, try a new code.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode()
    const roomRef = db.doc(`rooms/${code}`)

    const room: RoomDoc = {
      code,
      status: 'waiting',
      hostUid: uid,
      config: DEFAULT_ROOM_CONFIG,
    }
    const host: PlayerDoc = {
      name,
      seat: 0,
      stack: DEFAULT_ROOM_CONFIG.startingStack,
      connected: true,
    }

    // A batch writes both documents together or neither.
    const batch = db.batch()
    batch.create(roomRef, { ...room, createdAt: FieldValue.serverTimestamp() })
    batch.create(roomRef.collection('players').doc(uid), host)

    try {
      await batch.commit()
      return { code }
    } catch (error) {
      if (isAlreadyExists(error)) continue
      throw error
    }
  }
  throw new HttpsError('resource-exhausted', 'Could not make a table. Try again.')
})

/** Seats the caller at an existing table. Calling it again from a seated player is fine. */
export const joinRoom = onCall<RoomInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const name = requireName(request.data?.name)
  const code = normalizeRoomCode(request.data?.code)
  if (!code) throw new HttpsError('invalid-argument', 'That is not a valid table code.')

  const roomRef = db.doc(`rooms/${code}`)
  const playersRef = roomRef.collection('players')

  // A transaction makes "check there is a free seat, then take it" one step, so two
  // people joining at the same moment can't both get the last seat.
  return db.runTransaction(async (tx) => {
    const roomSnap = await tx.get(roomRef)
    if (!roomSnap.exists) throw new HttpsError('not-found', 'No table with that code.')
    const room = roomSnap.data() as RoomDoc

    const playersSnap = await tx.get(playersRef)
    const players = playersSnap.docs.map((d) => ({
      uid: d.id,
      ...(d.data() as PlayerDoc),
    }))

    // Already seated (a refresh, or tapping Join twice): nothing to do.
    const existing = players.find((p) => p.uid === uid)
    if (existing) return { code, seat: existing.seat }

    if (room.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'That game has already started.')
    }
    const seat = pickFreeSeat(players.map((p) => p.seat))
    if (seat === null) throw new HttpsError('failed-precondition', 'That table is full.')

    const player: PlayerDoc = {
      name,
      seat,
      stack: room.config.startingStack,
      connected: true,
    }
    tx.create(playersRef.doc(uid), player)
    return { code, seat }
  })
})

export { claimTimeout, dealNextHand, playAction, startGame } from './game.js'