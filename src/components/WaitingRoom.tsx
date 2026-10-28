import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { SeatedPlayer } from '@/lib/useRoom'

interface WaitingRoomProps {
  code: string
  players: SeatedPlayer[]
}

/** Shown to a seated player until the second player arrives. */
export function WaitingRoom({ code, players }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/room/${code}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join my poker table', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // The person closed the share sheet, or the browser blocked copying. Nothing to do.
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="text-sm tracking-widest text-white/60 uppercase">Your table code</p>
      <h1 className="text-6xl font-bold tracking-[0.3em]">{code}</h1>

      <button
        type="button"
        onClick={share}
        className="bg-chip-gold rounded-lg px-6 py-3 font-semibold text-black"
      >
        {copied ? 'Link copied!' : 'Share invite link'}
      </button>

      <ul className="w-full space-y-2" aria-label="Players at the table">
        {players
          .toSorted((a, b) => a.seat - b.seat)
          .map((player) => (
            <li key={player.uid} className="rounded-lg bg-black/30 px-4 py-3">
              {player.name}
            </li>
          ))}
        <li className="rounded-lg border-2 border-dashed border-white/20 px-4 py-3 text-white/50">
          Waiting for an opponent…
        </li>
      </ul>

      <Link to="/" className="text-sm underline underline-offset-4">
        Leave
      </Link>
    </main>
  )
}
