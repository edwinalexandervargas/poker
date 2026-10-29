import { collection, doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { PlayerDoc, RoomDoc } from '@shared/engine'
import { errorMessage } from '@/lib/api'
import { ensureSignedIn } from '@/lib/auth'
import { db } from '@/lib/db'

export type SeatedPlayer = PlayerDoc & { uid: string }

export type RoomView =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error'; message: string }
  | { status: 'ready'; room: RoomDoc; players: SeatedPlayer[]; myUid: string }

/**
 * Follows a table live. Firestore pushes every change, so when a friend joins,
 * this re-renders by itself with the new player list.
 *
 * Mount it with `key={code}` so a different table gets fresh state (see Room.tsx).
 */
export function useRoom(code: string | undefined): RoomView {
  // undefined = still loading, null = no such table
  const [room, setRoom] = useState<RoomDoc | null | undefined>(undefined)
  const [players, setPlayers] = useState<SeatedPlayer[] | undefined>(undefined)
  const [myUid, setMyUid] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!code) return

    let cancelled = false
    const unsubscribes: Unsubscribe[] = []
    const fail = (e: unknown) =>
      setError(
        (e as { code?: string }).code === 'permission-denied'
          ? 'You do not have access to this table.'
          : errorMessage(e),
      )

    ensureSignedIn()
      .then((user) => {
        if (cancelled) return
        setMyUid(user.uid)
        unsubscribes.push(
          onSnapshot(
            doc(db, 'rooms', code),
            (snap) => setRoom(snap.exists() ? (snap.data() as RoomDoc) : null),
            fail,
          ),
          onSnapshot(
            collection(db, 'rooms', code, 'players'),
            (snap) =>
              setPlayers(
                snap.docs.map((d) => ({ uid: d.id, ...(d.data() as PlayerDoc) })),
              ),
            fail,
          ),
        )
      })
      .catch(fail)

    // Stop listening when leaving the page or switching tables.
    return () => {
      cancelled = true
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [code])

  if (error) return { status: 'error', message: error }
  if (room === null) return { status: 'missing' }
  if (room === undefined || players === undefined || myUid === null) {
    return { status: 'loading' }
  }
  return { status: 'ready', room, players, myUid }
}
