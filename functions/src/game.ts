// The game functions: start a game, play a move, deal the next hand.
//
// Every function follows the same shape as in index.ts:
//   1. check who is asking and clean the input
//   2. read the table inside a transaction
//   3. let the shared engine decide what happens (this file contains no poker rules)
//   4. write the result, again inside the transaction
//
// Where things are stored (see firestore.rules for who can read what):
//   rooms/{code}/secret/hand      the full hand, deck and everyone's hole cards. Nobody can read it.
//   rooms/{code}/hand/current     the censored copy every player may see
//   rooms/{code}/private/{uid}    that one player's two hole cards. Only they can read it.
//   rooms/{code}/events/{id}      the action log ("Alex raises to 80"). Every player can read it.

import './options.js'
import {
  FieldValue,
  getFirestore,
  type DocumentReference,
  type Transaction,
} from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  isGone,
  canReactAgain,
  canRebuy,
  isReaction,
  createDeck,
  describeEnd,
  describeMove,
  describeStart,
  nextHand,
  normalizeRoomCode,
  packHand,
  packPublic,
  parseAction,
  playTurn,
  shuffle,
  settleShowdown,
  stacksBySeat,
  startHand,
  timeoutAction,
  type Action,
  toPublicState,
  unpackHand,
  type HandState,
  type PlayerDoc,
  type RoomDoc,
  type StoredHand,
} from '../../shared/engine/index.js'

/** How long a player has to act. Set TURN_SECONDS when starting the emulators to test with a short clock. */
const TURN_MS = Number(process.env.TURN_SECONDS ?? 30) * 1000

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

/** A seat's player name, for the action log. */
function namer(table: Table): (seat: number) => string {
  return (seat) => table.players.find((p) => p.seat === seat)?.name ?? `Seat ${seat + 1}`
}

/** The log lines for a move, plus the end of the hand if the move finished it. */
function moveLines(
  table: Table,
  before: HandState,
  action: Action,
  after: HandState,
): string[] {
  const name = namer(table)
  return [
    ...describeMove(before, action, after, table.room.config.bigBlind, name),
    ...describeEnd(after, name),
  ]
}

/** The log lines for a freshly dealt hand (and its end, if the blinds already decided it). */
function startLines(table: Table, hand: HandState): string[] {
  const name = namer(table)
  return [...describeStart(hand, name), ...describeEnd(hand, name)]
}

/**
 * Writes a hand to all three places, and `lines` to the action log. `reveal` is true when a
 * showdown just happened, so the public copy includes the hole cards of everyone still in.
 */
function saveHand(
  tx: Transaction,
  table: Table,
  state: HandState,
  reveal: boolean,
  lines: string[] = [],
): void {
  const { roomRef, players } = table

  // One document per line. `seq` sorts them: the time, then the line's place in this batch.
  const now = Date.now()
  lines.forEach((text, i) => {
    tx.set(roomRef.collection('events').doc(), {
      seq: now * 100 + i,
      handNumber: state.handNumber,
      text,
    })
  })

  tx.set(roomRef.collection('secret').doc('hand'), { state: packHand(state) })

  // The clock is the server's, so every screen counts down to the same moment. A finished
  // hand has nobody on the clock.
  const turnStartedAt = Date.now()
  tx.set(roomRef.collection('hand').doc('current'), {
    ...packPublic(toPublicState(state, reveal)),
    turnStartedAt,
    turnDeadline: state.toAct === null ? null : turnStartedAt + TURN_MS,
    updatedAt: FieldValue.serverTimestamp(),
  })

  for (const player of players) {
    // Someone who sat down mid-hand has no cards in this hand: an empty list.
    const cards = state.holeCards[player.seat] ?? []
    tx.set(roomRef.collection('private').doc(player.uid), {
      handNumber: state.handNumber,
      cards,
    })
    // When a hand ends, remember each player's chips on their own document. Only for
    // players who were dealt in: a newcomer's starting chips must not be overwritten.
    if (state.phase === 'complete' && cards.length > 0) {
      tx.update(roomRef.collection('players').doc(player.uid), {
        stack: state.stacks[player.seat],
      })
    }
  }
}

/** Players who have left (see isGone) but still have chips: they sit out the next hand. */
function goneWithChips(table: Table): SeatedPlayer[] {
  const now = Date.now()
  const gone = table.players.filter((p) => p.stack > 0 && isGone(p, now))
  const present = table.players.filter((p) => p.stack > 0 && !gone.includes(p))
  // Only sit people out if at least two players are still here; otherwise deal everyone,
  // so the game doesn't end just because someone stepped away.
  return present.length >= 2 ? gone : []
}

/** Chips per seat for the next hand, with anyone sitting out left at 0 (not dealt in). */
function stacksForNextHand(table: Table, sittingOut: SeatedPlayer[]): number[] {
  const stacks = stacksBySeat(table.players)
  for (const p of sittingOut) stacks[p.seat] = 0
  return stacks
}

/** Turns an engine error ("Not your turn", "Cannot check...") into a friendly error. */
function asRuleError(error: unknown): HttpsError {
  return new HttpsError(
    'failed-precondition',
    error instanceof Error ? error.message : 'That move is not allowed.',
  )
}

/** The host starts the game once at least two players are seated. Deals hand number 1. */
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
    if (players.length < 2) {
      throw new HttpsError(
        'failed-precondition',
        'You need at least two players to start.',
      )
    }

    // One entry per seat (8), 0 for empty seats. The lowest occupied seat starts on the button.
    const stacks = stacksBySeat(players)
    const { state, reveal } = settleShowdown(
      startHand({
        handNumber: 1,
        button: Math.min(...players.map((p) => p.seat)),
        stacks,
        smallBlind: room.config.smallBlind,
        bigBlind: room.config.bigBlind,
        deck: shuffle(createDeck()),
      }),
    )

    saveHand(tx, table, state, reveal, startLines(table, state))
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

    saveHand(
      tx,
      table,
      result.state,
      result.reveal,
      moveLines(table, state, action, result.state),
    )
    return { phase: result.state.phase }
  })
})

/**
 * After a hand ends, any seated player can deal the next one. Chips come from the player
 * documents, so anyone who sat down during the last hand is dealt in, and busted players
 * (0 chips) sit out. The game ends when fewer than two players have chips.
 */
export const dealNextHand = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    requireSeated(table, uid)
    const previous = await readHand(tx, table)
    const sittingOut = goneWithChips(table)

    let next
    try {
      next = nextHand(
        previous,
        table.room.config.smallBlind,
        table.room.config.bigBlind,
        shuffle(createDeck()),
        stacksForNextHand(table, sittingOut),
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
    const name = namer(table)
    saveHand(tx, table, dealt.state, dealt.reveal, [
      ...sittingOut.map((p) => `${name(p.seat)} is away and sits out`),
      ...startLines(table, dealt.state),
    ])
    return { finished: false, handNumber: dealt.state.handNumber }
  })
})

/**
 * Any seated player can call this once the player on the clock has run out of time.
 * The server checks the deadline itself (a browser's clock can't be trusted), then plays the
 * automatic move: check if that's free, otherwise fold.
 */
export const claimTimeout = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    requireSeated(table, uid)
    const state = await readHand(tx, table)
    const publicSnap = await tx.get(table.roomRef.collection('hand').doc('current'))
    const deadline: unknown = publicSnap.get('turnDeadline')

    if (state.toAct === null || typeof deadline !== 'number') {
      throw new HttpsError('failed-precondition', 'Nobody is on the clock.')
    }
    // Don't wait out the clock for someone who has left: play their move now.
    const acting = table.players.find((p) => p.seat === state.toAct)
    const gone = acting !== undefined && isGone(acting, Date.now())
    if (Date.now() < deadline && !gone) {
      throw new HttpsError('failed-precondition', 'Time is not up yet.')
    }

    const bigBlind = table.room.config.bigBlind
    const action = timeoutAction(state, bigBlind)
    let result
    try {
      result = playTurn(state, state.toAct, action, bigBlind)
    } catch (error) {
      throw asRuleError(error)
    }

    const name = namer(table)(state.toAct)
    saveHand(tx, table, result.state, result.reveal, [
      gone && Date.now() < deadline
        ? `${name} has left the table`
        : `${name} ran out of time`,
      ...moveLines(table, state, action, result.state),
    ])
    return { phase: result.state.phase }
  })
})

/**
 * A player's open table screen checks in every few seconds, and says goodbye when it's hidden
 * or closed. We record both, so everyone can tell "away" from "thinking", and the server can
 * stop waiting for someone who has gone (see isGone). Returns the server's clock so the caller
 * can correct for its own clock being off.
 */
export const heartbeat = onCall<GameInput & { leaving?: unknown }>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)
  const now = Date.now()
  // A screen that is being hidden or closed says goodbye, so the others see it at once.
  // Any normal check-in clears it again.
  const update =
    request.data?.leaving === true ? { leftAt: now } : { lastSeen: now, leftAt: null }

  try {
    await getFirestore().doc(`rooms/${code}/players/${uid}`).update(update)
  } catch {
    // update() fails when the document doesn't exist: this person isn't seated here.
    throw new HttpsError('permission-denied', 'You are not seated at this table.')
  }
  return { now }
})

/**
 * A busted player buys back in for the table's starting stack. Their chips are on their
 * player document, so they're dealt in from the next hand, like a newcomer. If the game had
 * ended because too few players had chips, it starts up again.
 */
export const rebuy = onCall<GameInput>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    const me = requireSeated(table, uid)
    if (!canRebuy(me.stack, table.room.status)) {
      throw new HttpsError(
        'failed-precondition',
        me.stack > 0 ? 'You still have chips.' : 'The game has not started yet.',
      )
    }

    const stack = table.room.config.startingStack
    tx.update(table.roomRef.collection('players').doc(uid), {
      stack,
      rebuys: (me.rebuys ?? 0) + 1,
    })
    if (table.room.status === 'finished') {
      tx.update(table.roomRef, { status: 'playing' })
    }
    tx.set(table.roomRef.collection('events').doc(), {
      seq: Date.now() * 100,
      handNumber: 0,
      text: `${me.name} rebuys for ${stack.toLocaleString('en-US')}`,
    })
    return { stack }
  })
})

/**
 * A seated player sends an emoji reaction. Only the fixed list of emojis is accepted, and one
 * per player every REACTION_COOLDOWN_MS, so nobody can post text or flood the table. It's
 * stored on their player document, so every screen sees it with the player list it already
 * follows.
 */
export const react = onCall<GameInput & { emoji?: unknown }>(async (request) => {
  const uid = requireUid(request.auth?.uid)
  const code = requireCode(request.data?.code)
  const emoji = request.data?.emoji
  if (!isReaction(emoji))
    throw new HttpsError('invalid-argument', 'That reaction is not allowed.')

  return getFirestore().runTransaction(async (tx) => {
    const table = await readTable(tx, code)
    const me = requireSeated(table, uid)
    const now = Date.now()
    if (!canReactAgain(me.reaction?.at, now)) {
      throw new HttpsError('resource-exhausted', 'Easy there. One reaction at a time.')
    }
    tx.update(table.roomRef.collection('players').doc(uid), {
      reaction: { emoji, at: now },
    })
    return { at: now }
  })
})
