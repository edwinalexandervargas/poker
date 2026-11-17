import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { ChevronIcon } from '@/components/Icons'
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

  if (hands === null) return <p className="text-muted py-6 text-center">Loading…</p>
  if (hands.length === 0)
    return <p className="text-muted py-6 text-center">Finished hands show up here.</p>

  return (
    <ol className="space-y-1.5">
      {hands.map((hand) => {
        const isOpen = open === hand.handNumber
        return (
          <li key={hand.handNumber} className="rounded-2xl bg-white/[0.035]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : hand.handNumber)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm"
            >
              <span className="chip font-num shrink-0 !px-2 !py-0.5 text-xs">
                #{hand.handNumber}
              </span>
              <span className="text-paper/80 min-w-0 flex-1 truncate">
                {hand.summary ?? 'In progress'}
              </span>
              <ChevronIcon
                className={`text-muted size-4 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              />
            </button>
            {isOpen && (
              <ol className="text-paper/75 space-y-1 border-t border-white/[0.06] px-3 py-2.5 pl-[3.6rem] text-sm">
                {hand.lines.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ol>
            )}
          </li>
        )
      })}
    </ol>
  )
}
