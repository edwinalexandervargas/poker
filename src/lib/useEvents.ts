import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db'

/** One line of the action log. */
export interface LogLine {
  id: string
  /** Sort key written by the server: its clock, then the line's place in its batch. */
  seq: number
  handNumber: number
  text: string
}

/** How many recent lines to keep. Older ones are still stored, just not downloaded. */
export const LOG_LINES = 40

/**
 * Follows the table's action log live. Asks Firestore for the newest lines only (sorted on
 * the server's `seq`, a single field, so no extra index is needed), and returns them oldest
 * first, ready to show top to bottom.
 */
export function useEvents(code: string): LogLine[] {
  const [lines, setLines] = useState<LogLine[]>([])

  useEffect(() => {
    const newest = query(
      collection(db, 'rooms', code, 'events'),
      orderBy('seq', 'desc'),
      limit(LOG_LINES),
    )
    const unsubscribe: Unsubscribe = onSnapshot(
      newest,
      (snap) =>
        setLines(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as Omit<LogLine, 'id'>) }))
            .reverse(),
        ),
      // The log is a nice-to-have: if it can't load, the game still works.
      () => setLines([]),
    )
    return unsubscribe
  }, [code])

  return lines
}
