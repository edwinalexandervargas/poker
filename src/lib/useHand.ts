import { doc, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { unpackPublic, type StoredPublicHand } from '@shared/engine/storage'
import type { PublicHandState } from '@shared/engine'
import { errorMessage } from '@/lib/api'
import { db } from '@/lib/db'
import type { MyCards } from '@/lib/tableFromHand'
import { turnClockFromDoc, type TurnClock } from '@/lib/turnClock'

export type HandView =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ready'
      hand: PublicHandState | null
      myCards: MyCards | null
      /** Who is on the clock and until when. Null when nobody is. */
      turn: TurnClock | null
    }

/**
 * Follows the current hand live: the public copy everyone sees, and my own two cards.
 * (Firestore rules let me read my own private document and nobody else's.)
 *
 * Mount it with `key={code}` so a different table starts fresh, like useRoom.
 */
export function useHand(code: string, uid: string): HandView {
  // undefined = still loading, null = nothing there yet
  const [hand, setHand] = useState<PublicHandState | null | undefined>(undefined)
  const [myCards, setMyCards] = useState<MyCards | null | undefined>(undefined)
  const [turn, setTurn] = useState<TurnClock | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fail = (e: unknown) => setError(errorMessage(e))
    const unsubscribes: Unsubscribe[] = [
      onSnapshot(
        doc(db, 'rooms', code, 'hand', 'current'),
        (snap) => {
          setHand(snap.exists() ? unpackPublic(snap.data() as StoredPublicHand) : null)
          // Remember how far this computer's clock is from the server's at this moment.
          setTurn(turnClockFromDoc(snap.data(), Date.now()))
        },
        fail,
      ),
      onSnapshot(
        doc(db, 'rooms', code, 'private', uid),
        (snap) => setMyCards(snap.exists() ? (snap.data() as MyCards) : null),
        fail,
      ),
    ]
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [code, uid])

  if (error) return { status: 'error', message: error }
  if (hand === undefined || myCards === undefined) return { status: 'loading' }
  return { status: 'ready', hand, myCards, turn }
}
