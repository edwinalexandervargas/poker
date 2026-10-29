import { useEffect, useRef } from 'react'
import type { LogLine } from '@/lib/useEvents'

interface ActionLogProps {
  lines: LogLine[]
}

/**
 * The running list of what happened ("Alex raises to 80"), oldest at the top. Shown in a
 * dialog from the Log button. It stays live while open and keeps the newest line in view.
 */
export function ActionLog({ lines }: ActionLogProps) {
  const endRef = useRef<HTMLLIElement>(null)

  // Keep the newest line in view when the log opens and whenever a line arrives.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [lines])

  if (lines.length === 0) {
    return <p className="text-white/60">Nothing has happened at this table yet.</p>
  }

  return (
    <ol className="space-y-1 text-sm" aria-live="polite">
      {lines.map((line, i) => {
        const startsHand = line.text.startsWith('Hand ')
        return (
          <li
            key={line.id}
            ref={i === lines.length - 1 ? endRef : undefined}
            className={`${startsHand && i > 0 ? 'mt-2 border-t border-white/10 pt-2' : ''} ${
              startsHand ? 'font-semibold text-white' : 'text-white/75'
            }`}
          >
            {line.text}
          </li>
        )
      })}
    </ol>
  )
}
