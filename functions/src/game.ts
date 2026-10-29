// The game functions: start a game, play a move, deal the next hand.
//
// Every function follows the same shape as in index.ts:
//   1. check who is asking and clean the input
//   2. read the table inside a transaction
//   3. let the shared engine decide what happens (this file contains no poker rules)
//   4. write the result, again inside the transaction
//
// Where things are stored (see firestore.rules for who can read what):
//   rooms/{code}/secret/hand      the full hand, deck and hole cards included. Nobody can read it.
//   rooms/{code}/hand/current     the censored copy every player may see
//   rooms/{code}/private/{uid}    that one player's two hole cards. Only they can read it.

import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  createDeck,
  nextHand,
  normalizeRoomCode,
  packHand,
  packPublic,
  parseAction,
  playTurn,
  shuffle,
  settleShowdown,
  startHand,
  toPublicState,
  unpackHand,
  type HandState,
  type PlayerDoc,
  type RoomDoc,
  type StoredHand,
} from '../../shared/engine/index.js'

type SeatedPlayer = PlayerDoc & { uid: string }

interface Table {
  roomRef: DocumentReference
  room: RoomDoc
  players: SeatedPlayer[]
}

interface GameInput {
  code?: unknown
  action?: unknown
}

function requireUid(uid: string | undefined): string {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.')
  return uid
}

function requireCode(input: unknown): string {
  const code = normalizeRoomCode(input)
  if (!code) throw new HttpsError('invalid-argument', 'That is not a valid table code.')
  return code
}

/** Reads the room and everyone seated at it. Must run before any write in the transaction. */
async function readTable(tx: Transaction, code: string): Promise<Table> {
  const roomRef = getFirestore().doc(`rooms/${code}`)
  const [roomSnap, playersSnap] = await Promise.all([
    tx.get(roomRef),
    tx.get(roomRef.collection('players')),
  ])
  if (!roomSnap.exists) throw new HttpsError('not-found', 'No table with that code.')
  return {
    roomRef,
    room: roomSnap.data() as RoomDoc,
    players: playersSnap.docs.map((d) => ({ uid: d.id, ...(d.data() as PlayerDoc) })),
  }
}

function requireSeated(table: Table, uid: string): SeatedPlayer {
  const me = table.players.find((p) => p.uid === uid)
  if (!me) throw new HttpsError('permission-denied', 'You are not seated at this table.')
  return me
}

/** Loads the secret, full hand. */
async function readHand(tx: Transaction, table: Table): Promise<HandState> {
  const snap = await tx.get(table.roomRef.collection('secret').doc('hand'))
  if (!snap.exists) throw new HttpsError('failed-precondition', 'No hand is in progress.')
  return unpackHand(snap.get('state') as StoredHand)
}

/**
 * Writes a hand to all three places. `reveal` is true when a showdown just happened, so
 * the public copy includes both players' hole cards.
 */
function saveHand(
  tx: Transaction,
  table: Table,
  state: HandState,
  reveal: boolean,
): void {
  const { roomRef, players } = table

  tx.set(roomRef.collection('secret').doc('hand'), { state: packHand(state) })

  tx.set(roomRef.collection('hand').doc('current'), {
    ...packPublic(toPublicState(state, reveal)),
    updatedAt: FieldValue.serverTimestamp(),
  })

  for (const player of players) {
    tx.set(roomRef.collection('private').doc(player.uid), {
      handNumber: state.handNumber,
      cards: state.holeCards[player.seat],
    })
    // When a hand ends, remember each player's chips on their own document.
    if (state.phase === 'complete') {
      tx.update(roomRef.collection('players').doc(player.uid), {
        stack: state.stacks[player.seat],
      })
    }
  }
}

/** Turns an engine error ("Not your turn", "Cannot check...") into a friendly error. */
function asRuleError(error: unknown): HttpsError {
  return new HttpsError(
    'failed-precondition',
    error instanceof Error ? error.message : 'That move is not allowed.',
  )
}

/** The host starts the game once two players are seated. Deals hand number 1. */
export const startGame = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    const { room, players } = table

    if (room.hostUid !== uid) {
      throw new HttpsError('permission-denied', 'Only the host can start the game.')
    }
    if (room.status !== 'waiting') {
      throw new HttpsError('failed-precondition', 'The game has already started.')
    }
    const seat0 = players.find((p) => p.seat === 0)
    const seat1 = players.find((p) => p.seat === 1)
    if (!seat0 || !seat1) {
      throw new HttpsError('failed-precondition', 'You need two players to start.')
    }

    const { state, reveal } = settleShowdown(
      startHand({
        handNumber: 1,
        button: 0,
        stacks: [seat0.stack, seat1.stack],
        smallBlind: room.config.smallBlind,
        bigBlind: room.config.bigBlind,
        deck: shuffle(createDeck()),
      }),
    )

    saveHand(tx, table, state, reveal)
    tx.update(table.roomRef, { status: 'playing' })
    return { handNumber: state.handNumber }
  })
})

/** A seated player makes a move: fold, check, call or raise. */
export const playAction = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)
  const action = parseAction(request.data?.action)
  if (!action) throw new HttpsError('invalid-argument', 'That is not a valid move.')

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    const me = requireSeated(table, uid)
    const state = await readHand(tx, table)

    let result
    try {
      result = playTurn(state, me.seat, action, table.room.config.bigBlind)
    } catch (error) {
      throw asRuleError(error)
    }

    saveHand(tx, table, result.state, result.reveal)
    return { phase: result.state.phase }
  })
})

/** After a hand ends, either seated player can deal the next one. Ends the game if someone is out. */
export const dealNextHand = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    requireSeated(table, uid)
    const previous = await readHand(tx, table)

    let next
    try {
      next = nextHand(
        previous,
        table.room.config.smallBlind,
        table.room.config.bigBlind,
        shuffle(createDeck()),
      )
    } catch (error) {
      throw asRuleError(error)
    }

    if (next === null) {
      tx.update(table.roomRef, { status: 'finished' })
      return { finished: true }
    }
    // Blinds can put a player all-in before anyone acts; then the hand is already at showdown.
    const dealt = settleShowdown(next)
    saveHand(tx, table, dealt.state, dealt.reveal)
    return { finished: false, handNumber: dealt.state.handNumber }
  })
})
