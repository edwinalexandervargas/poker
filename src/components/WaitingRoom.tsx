import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MAX_SEATS } from '@shared/engine/types'
import type { SeatedPlayer } from '@/lib/useRoom'

interface WaitingRoomProps {
  code: string
  players: SeatedPlayer[]
  /** Only the host can start the game. */
  isHost: boolean
  onStart: () => void
  starting: boolean
  error: string | null
}

/** Shown to a seated player until the game starts. */
export function WaitingRoom({
  code,
  players,
  isHost,
  onStart,
  starting,
  error,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false)
  const full = players.length >= MAX_SEATS
  const canStart = players.length >= 2

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

      {!full && (
        <button type="button" onClick={share} className="btn btn-gold">
          {copied ? 'Link copied!' : 'Share invite link'}
        </button>
      )}

      <ul className="w-full space-y-2" aria-label="Players at the table">
        {players
          .toSorted((a, b) => a.seat - b.seat)
          .map((player) => (
            <li
              key={player.uid}
              className="glass rounded-full px-5 py-3 text-left font-medium"
            >
              {player.name}
            </li>
          ))}
        {!full && (
          <li className="rounded-lg border-2 border-dashed border-white/20 px-4 py-3 text-white/50">
            {canStart
              ? `${players.length} of ${MAX_SEATS} seats taken. More can join, even after you start.`
              : 'Waiting for at least one more player…'}
          </li>
        )}
      </ul>

      {canStart &&
        (isHost ? (
          <button
            type="button"
            onClick={onStart}
            disabled={starting}
            className="btn btn-gold text-lg"
          >
            {starting ? 'Dealing…' : 'Start game'}
          </button>
        ) : (
          <p className="text-white/70">Waiting for the host to start the game…</p>
        ))}

      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}

      <Link to="/" className="text-sm underline underline-offset-4">
        Leave
      </Link>
    </main>
  )
}
