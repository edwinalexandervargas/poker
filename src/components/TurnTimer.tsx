import { useEffect, useState } from 'react'
import { msLeft, type TurnClock } from '@/lib/turnClock'

interface TurnTimerProps {
  turn: TurnClock
  /** "Your turn" or "Bob’s turn". */
  label: string
}

/** A countdown bar for whoever is on the clock. Turns red in the last quarter. */
export function TurnTimer({ turn, label }: TurnTimerProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  const left = msLeft(turn, now)
  const share = turn.totalMs > 0 ? left / turn.totalMs : 0
  const low = share < 0.25

  return (
    <div
      role="timer"
      aria-label={`${label}, ${Math.ceil(left / 1000)} seconds left`}
      className="w-full max-w-md"
    >
      <div className="mb-1 flex justify-between text-sm text-white/70">
        <span>{label}</span>
        <span className={low ? 'text-red-300' : undefined}>
          {Math.ceil(left / 1000)}s
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${low ? 'bg-red-400' : 'bg-chip-gold'}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  )
}
