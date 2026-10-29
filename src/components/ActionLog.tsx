import { useEffect, useRef, useState } from 'react'
import type { LogLine } from '@/lib/useEvents'

interface ActionLogProps {
  lines: LogLine[]
}

/**
 * The running list of what happened ("Alex raises to 80"). Collapsed it shows the latest
 * line; open, the recent history, kept scrolled to the newest line.
 */
export function ActionLog({ lines }: ActionLogProps) {
  const [open, setOpen] = useState(false)
  const listRef = useRef<HTMLOListElement>(null)
  const latest = lines.at(-1)

  // Keep the newest line in view when one arrives (or the log is opened).
  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [lines, open])

  if (!latest) return null

  return (
    <section
      className="glass w-full max-w-md rounded-3xl text-sm"
      aria-label="Action log"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left"
      >
        <span className="truncate text-white/80">
          {open ? 'Action log' : latest.text}
        </span>
        <span className="shrink-0 text-xs text-white/50">{open ? 'Hide' : 'Log'}</span>
      </button>
      {open && (
        <ol
          ref={listRef}
          className="max-h-48 space-y-1 overflow-y-auto border-t border-white/10 px-4 py-2"
          aria-live="polite"
        >
          {lines.map((line, i) => {
            // A thin divider where a new hand starts.
            const newHand = i > 0 && line.handNumber > 0 && line.text.startsWith('Hand ')
            return (
              <li
                key={line.id}
                className={`${newHand ? 'mt-2 border-t border-white/10 pt-2' : ''} ${
                  line.text.startsWith('Hand')
                    ? 'font-semibold text-white'
                    : 'text-white/75'
                }`}
              >
                {line.text}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
