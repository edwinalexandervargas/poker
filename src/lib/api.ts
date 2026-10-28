import { httpsCallable } from 'firebase/functions'
import { ensureSignedIn } from '@/lib/auth'
import { functions } from '@/lib/firebase'

// The only way the browser changes game data: ask a Cloud Function.

const createRoomFn = httpsCallable<{ name: string }, { code: string }>(
  functions,
  'createRoom',
)
const joinRoomFn = httpsCallable<{ code: string; name: string }, { code: string }>(
  functions,
  'joinRoom',
)

export async function createRoom(name: string): Promise<string> {
  await ensureSignedIn()
  const { data } = await createRoomFn({ name })
  return data.code
}

export async function joinRoom(code: string, name: string): Promise<string> {
  await ensureSignedIn()
  const { data } = await joinRoomFn({ code, name })
  return data.code
}

/** A message safe to show a player. The functions' own messages ("That table is full.") pass through. */
export function errorMessage(error: unknown): string {
  const code = (error as { code?: string }).code ?? ''
  if (code.startsWith('functions/') && code !== 'functions/internal') {
    return (error as Error).message
  }
  return 'Could not reach the game server. Is `npm run emulators` running?'
}
