import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/db'
import { groupByHand, type HandRecord } from '@/lib/history'
import type { LogLine } from '@/lib/useEvents'

/** How far back the history goes. */
const HISTORY_LINES = 500

/**
 * Past hands at this table, newest first, built from the action log. Loaded once when opened
 * (not live), so it costs nothing while it's closed.
 */
export function HandHistory({ code }: { code: string }) {
  const [hands, setHands] = useState<HandRecord[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    const recent = query(
      collection(db, 'rooms', code, 'events'),
      orderBy('seq', 'desc'),
      limit(HISTORY_LINES),
    )
    getDocs(recent)
      .then((snap) => {
        const lines = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LogLine, 'id'>) }))
          .reverse()
        setHands(groupByHand(lines))
      })
      .catch(() => setHands([]))
  }, [code])

  if (hands === null) return <p className="text-white/60">Loading…</p>
  if (hands.length === 0) return <p className="text-white/60">No hands played yet.</p>

  return (
    <ol className="space-y-2">
      {hands.map((hand) => (
        <li key={hand.handNumber} className="rounded-lg bg-black/30">
          <button
            type="button"
            onClick={() => setOpen(open === hand.handNumber ? null : hand.handNumber)}
            aria-expanded={open === hand.handNumber}
            className="flex w-full items-baseline gap-3 px-3 py-2 text-left text-sm"
          >
            <span className="shrink-0 font-semibold">#{hand.handNumber}</span>
            <span className="truncate text-white/70">
              {hand.summary ?? 'In progress'}
            </span>
          </button>
          {open === hand.handNumber && (
            <ol className="space-y-0.5 border-t border-white/10 px-3 py-2 text-sm text-white/75">
              {hand.lines.map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ol>
          )}
        </li>
      ))}
    </ol>
  )
}
