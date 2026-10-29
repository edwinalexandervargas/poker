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
      <div className="short:mb-0.5 short:text-xs mb-1 flex justify-between text-sm text-white/70">
        <span>{label}</span>
        <span className={low ? 'text-red-300' : undefined}>
          {Math.ceil(left / 1000)}s
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${low ? 'bg-gradient-to-r from-[#e2585e] to-[#ff8a7a]' : 'bg-gradient-to-r from-[#d4a945] to-[#f0d27f]'}`}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  )
}
