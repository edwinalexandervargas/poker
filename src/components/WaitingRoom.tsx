import { Link } from 'react-router-dom'
import { MAX_SEATS } from '@shared/engine/types'
import { Avatar } from '@/components/Avatar'
import { BackIcon, CheckIcon, LinkIcon } from '@/components/Icons'
import type { SeatedPlayer } from '@/lib/useRoom'
import { useInvite } from '@/lib/useInvite'

interface WaitingRoomProps {
  code: string
  players: SeatedPlayer[]
  /** Only the host can start the game. */
  isHost: boolean
  onStart: () => void
  starting: boolean
  error: string | null
}

/** Shown to a seated player until the game starts: the code, the invite, and the eight seats. */
export function WaitingRoom({
  code,
  players,
  isHost,
  onStart,
  starting,
  error,
}: WaitingRoomProps) {
  const { share, copied } = useInvite(code)
  const full = players.length >= MAX_SEATS
  const canStart = players.length >= 2
  const bySeat = new Map(players.map((p) => [p.seat, p]))

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <Link to="/" className="icon-btn -ml-2 self-start text-sm">
        <BackIcon />
        Leave
      </Link>

      <div className="text-center">
        <p className="text-muted text-sm">Table code</p>
        <h1 className="mt-1 text-6xl font-bold tracking-[0.16em]">{code}</h1>
        {!full && (
          <button type="button" onClick={share} className="btn btn-ghost mt-4 text-sm">
            {copied ? <CheckIcon /> : <LinkIcon />}
            {copied ? 'Link copied' : 'Share invite link'}
          </button>
        )}
      </div>

      {/* All eight seats: who's sitting, and how many are still open. */}
      <ul className="grid grid-cols-2 gap-2" aria-label="Seats at the table">
        {Array.from({ length: MAX_SEATS }, (_, seat) => {
          const player = bySeat.get(seat)
          return player ? (
            <li
              key={seat}
              className="panel flex items-center gap-2.5 rounded-2xl p-2 !shadow-none"
            >
              <Avatar name={player.name} seat={seat} className="size-8 text-sm" />
              <span className="truncate text-sm font-semibold">{player.name}</span>
            </li>
          ) : (
            <li
              key={seat}
              className="text-muted/70 flex items-center gap-2.5 rounded-2xl border border-dashed border-white/10 p-2 text-sm"
            >
              <span className="size-8 rounded-full border border-dashed border-white/10" />
              Open seat
            </li>
          )
        })}
      </ul>

      <div className="flex flex-col items-center gap-2 text-center">
        {canStart ? (
          isHost ? (
            <button
              type="button"
              onClick={onStart}
              disabled={starting}
              className="btn btn-gold w-full text-lg"
            >
              {starting ? 'Dealing…' : `Start with ${players.length} players`}
            </button>
          ) : (
            <p className="text-muted">Waiting for the host to start the game…</p>
          )
        ) : (
          <p className="text-muted">Waiting for at least one more player…</p>
        )}
        {canStart && !full && (
          <p className="text-muted text-xs">
            More can join after you start, from the next hand.
          </p>
        )}
        {error && (
          <p role="alert" className="text-fold text-sm">
            {error}
          </p>
        )}
      </div>
    </main>
  )
}
