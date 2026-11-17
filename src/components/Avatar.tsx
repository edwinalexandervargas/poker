import { useState } from 'react'
import { initials, seatColor } from '@/lib/seatColors'
import { msLeft, type TurnClock } from '@/lib/turnClock'

interface AvatarProps {
  name: string
  seat: number
  /** Width and height, as a Tailwind size class. */
  className?: string
  /** The countdown for this player, drawn as a ring that drains around the avatar. */
  turn?: TurnClock | null
  /** A small amber dot: this player's screen has stopped checking in. */
  away?: boolean
}

/** A round badge with the player's initials, in their seat colour. */
export function Avatar({
  name,
  seat,
  className = 'size-10',
  turn = null,
  away = false,
}: AvatarProps) {
  const color = seatColor(seat)
  return (
    <span
      className={`font-num relative inline-flex shrink-0 items-center justify-center rounded-full text-[0.95em] leading-none ${className}`}
      style={{
        background: `color-mix(in oklab, ${color} 22%, #141b24)`,
        color,
        boxShadow: `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent), 0 4px 12px rgb(0 0 0 / 0.35)`,
      }}
      aria-hidden
    >
      {initials(name)}
      {/* Keyed by the deadline, so each new turn starts a fresh ring. */}
      {turn && <TurnRing key={turn.deadline} turn={turn} />}
      {away && (
        <span className="absolute -right-0.5 -bottom-0.5 size-[30%] rounded-full bg-amber-400 ring-2 ring-[#0c1117]" />
      )}
    </span>
  )
}

/**
 * The ring. Where the clock stands is read once, when the ring appears; from there a CSS
 * animation drains it to empty in the time left, so the clock never re-renders React.
 */
function TurnRing({ turn }: { turn: TurnClock }) {
  const [start] = useState(() => {
    const left = msLeft(turn, Date.now())
    const share = turn.totalMs > 0 ? left / turn.totalMs : 0
    return { left, used: (1 - share) * 100 }
  })
  return (
    <svg
      className="turn-ring pointer-events-none absolute -inset-[4px] size-[calc(100%+8px)] -rotate-90"
      viewBox="0 0 44 44"
      style={
        {
          '--ring-ms': `${Math.max(0, start.left)}ms`,
          '--ring-from': start.used,
        } as React.CSSProperties
      }
    >
      <circle
        cx="22"
        cy="22"
        r="20.5"
        fill="none"
        stroke="rgb(255 255 255 / 0.12)"
        strokeWidth="2.5"
      />
      <circle
        className="ring-fill"
        cx="22"
        cy="22"
        r="20.5"
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="100"
        style={{ strokeDashoffset: start.used }}
      />
    </svg>
  )
}
