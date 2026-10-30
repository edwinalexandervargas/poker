import { httpsCallable } from 'firebase/functions'
import type { Action } from '@shared/engine'
import { ensureSignedIn } from '@/lib/auth'
import { functions } from '@/lib/firebase'

// The only way the browser changes game data: ask a Cloud Function.

const createRoomFn = httpsCallable<
  { name: string; showStrength: boolean },
  { code: string }
>(functions, 'createRoom')
const joinRoomFn = httpsCallable<{ code: string; name: string }, { code: string }>(
  functions,
  'joinRoom',
)

const startGameFn = httpsCallable<{ code: string }, { handNumber: number }>(
  functions,
  'startGame',
)
const playActionFn = httpsCallable<{ code: string; action: Action }, { phase: string }>(
  functions,
  'playAction',
)
const dealNextHandFn = httpsCallable<{ code: string }, { finished: boolean }>(
  functions,
  'dealNextHand',
)
const claimTimeoutFn = httpsCallable<{ code: string }, { phase: string }>(
  functions,
  'claimTimeout',
)
const heartbeatFn = httpsCallable<{ code: string; leaving: boolean }, { now: number }>(
  functions,
  'heartbeat',
)
const rebuyFn = httpsCallable<{ code: string }, { stack: number }>(functions, 'rebuy')
const sendChatFn = httpsCallable<{ code: string; text: string }, { at: number }>(
  functions,
  'sendChat',
)
const reactFn = httpsCallable<{ code: string; emoji: string }, { at: number }>(
  functions,
  'react',
)

/** Makes a table. `showStrength` gives every player a rough chance-of-winning bar. */
export async function createRoom(name: string, showStrength = false): Promise<string> {
  await ensureSignedIn()
  const { data } = await createRoomFn({ name, showStrength })
  return data.code
}

export async function joinRoom(code: string, name: string): Promise<string> {
  await ensureSignedIn()
  const { data } = await joinRoomFn({ code, name })
  return data.code
}

/** The host starts the game once two players are seated. */
export async function startGame(code: string): Promise<void> {
  await ensureSignedIn()
  await startGameFn({ code })
}

/** Fold, check, call or raise. The server decides whether it is legal. */
export async function playAction(code: string, action: Action): Promise<void> {
  await ensureSignedIn()
  await playActionFn({ code, action })
}

/** After a hand ends, deal the next one (or end the game if someone is out of chips). */
/** Send a chat message to the table. Throws with a message safe to show if it's refused. */
export async function sendChat(code: string, text: string): Promise<void> {
  await ensureSignedIn()
  try {
    await sendChatFn({ code, text })
  } catch (error) {
    throw new Error(errorMessage(error))
  }
}

/** Send an emoji reaction to the table. */
export async function react(code: string, emoji: string): Promise<void> {
  await ensureSignedIn()
  await reactFn({ code, emoji })
}

/** A busted player buys back in for the starting stack, dealt in from the next hand. */
export async function rebuy(code: string): Promise<void> {
  await ensureSignedIn()
  await rebuyFn({ code })
}

export async function dealNextHand(code: string): Promise<void> {
  await ensureSignedIn()
  await dealNextHandFn({ code })
}

/** The player on the clock ran out of time. The server checks the deadline and plays the automatic move. */
export async function claimTimeout(code: string): Promise<void> {
  await ensureSignedIn()
  await claimTimeoutFn({ code })
}

/** "I'm still here." Returns the server's clock in milliseconds. */
export async function heartbeat(code: string, leaving = false): Promise<number> {
  await ensureSignedIn()
  const { data } = await heartbeatFn({ code, leaving })
  return data.now
}

/** A message safe to show a player. The functions' own messages ("That table is full.") pass through. */
export function errorMessage(error: unknown): string {
  const code = (error as { code?: string }).code ?? ''
  if (code.startsWith('functions/') && code !== 'functions/internal') {
    return (error as Error).message
  }
  return import.meta.env.DEV
    ? 'Could not reach the game server. Is `npm run emulators` running?'
    : 'Could not reach the game server. Check your connection and try again.'
}
