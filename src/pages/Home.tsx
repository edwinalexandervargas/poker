import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { normalizeRoomCode } from '@shared/engine/room'
import type { Card as CardCode } from '@shared/engine'
import { StaticCard } from '@/components/StaticCard'
import { createRoom, errorMessage, joinRoom } from '@/lib/api'
import { functions } from '@/lib/firebase'
import { useUiStore } from '@/store/ui'

// The lobby's picture: a hand fanned out like it's just been peeked at.
const HERO_HAND: CardCode[] = ['Ks', 'Ah', 'Qd']
const FAN = [
  '-rotate-[14deg] translate-x-9 translate-y-3 group-hover:translate-x-7',
  'z-10 -translate-y-1',
  'rotate-[14deg] -translate-x-9 translate-y-3 group-hover:-translate-x-7',
]

export default function Home() {
  // Fetch the table page in the background while the lobby is open, so it is already
  // cached by the time you create or join a room.
  useEffect(() => {
    void import('@/pages/Room')
  }, [])

  const navigate = useNavigate()
  const { playerName, setPlayerName } = useUiStore()
  const [code, setCode] = useState('')
  const [pingResult, setPingResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Host setting for the new table: show everyone the nut meter.
  const [showStrength, setShowStrength] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const hasName = playerName.trim().length > 0
  const normalizedCode = normalizeRoomCode(code)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      navigate(`/room/${await createRoom(playerName, showStrength)}`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  async function handleJoin() {
    if (!normalizedCode) return
    setBusy(true)
    setError(null)
    try {
      navigate(`/room/${await joinRoom(normalizedCode, playerName)}`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  async function testEmulator() {
    setPingResult('Calling emulator…')
    try {
      const ping = httpsCallable<void, { ok: boolean; deckSize: number }>(
        functions,
        'ping',
      )
      const { data } = await ping()
      setPingResult(
        `Functions emulator OK (deck of ${data.deckSize} cards shuffled server-side)`,
      )
    } catch {
      setPingResult('Could not reach the emulator. Is `npm run emulators` running?')
    }
  }

  return (
    // Centred on the screen, clear of the notch and the home bar. Sideways on a phone, the
    // title and cards go on the left and the form on the right, so nothing needs scrolling.
    <main className="landscape-phone:max-w-4xl landscape-phone:grid landscape-phone:grid-cols-2 landscape-phone:content-center landscape-phone:gap-x-12 landscape-phone:gap-y-4 mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-7 px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div
        className="group landscape-phone:col-start-1 landscape-phone:row-start-1 landscape-phone:self-end flex justify-center pt-2"
        aria-hidden
      >
        {HERO_HAND.map((card, i) => (
          <StaticCard
            key={card}
            card={card}
            className={`landscape-phone:h-24 landscape-phone:w-16 h-32 w-[5.4rem] origin-bottom transition-transform duration-300 ${FAN[i]}`}
          />
        ))}
      </div>

      <div className="landscape-phone:col-start-1 landscape-phone:row-start-2 text-center">
        <h1 className="landscape-phone:text-5xl font-display text-6xl leading-[0.9] font-extrabold tracking-[-0.045em] [font-stretch:92%]">
          Poker Table
        </h1>
        <p className="text-muted mx-auto mt-3 max-w-[30ch] text-balance">
          Texas Hold’em with up to 8 friends. Play money, nothing to install, no sign-up.
        </p>
      </div>

      <div className="panel landscape-phone:col-start-2 landscape-phone:row-span-3 landscape-phone:row-start-1 landscape-phone:self-center flex w-full flex-col gap-3 rounded-[1.75rem] p-4 sm:p-5">
        <label className="flex flex-col gap-1.5">
          <span className="px-1 text-sm font-medium">Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="What the table calls you"
            maxLength={20}
            autoComplete="nickname"
            className="field"
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl px-1 py-1 text-sm">
          <span>
            Show hand strength
            <span className="text-muted block text-xs">
              Each player sees a bar for how close they are to the best hand
            </span>
          </span>
          <input
            type="checkbox"
            checked={showStrength}
            onChange={(e) => setShowStrength(e.target.checked)}
            className="toggle"
          />
        </label>
        <button
          type="button"
          disabled={!hasName || busy}
          onClick={handleCreate}
          className="btn btn-gold"
        >
          {busy ? 'Working…' : 'Create a table'}
        </button>

        <div className="text-muted flex items-center gap-3 py-1 text-xs" aria-hidden>
          <span className="h-px flex-1 bg-white/[0.08]" />
          or join with a code
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Table code"
            aria-label="Table code"
            maxLength={6}
            autoCapitalize="characters"
            className="field min-w-0 flex-1 font-semibold tracking-[0.2em] uppercase placeholder:font-normal placeholder:tracking-normal placeholder:normal-case"
          />
          <button
            type="button"
            disabled={!hasName || !normalizedCode || busy}
            onClick={handleJoin}
            className="btn btn-ghost"
          >
            Join
          </button>
        </div>
        {!hasName && (code || busy) && (
          <p className="text-muted px-1 text-xs">Add your name first.</p>
        )}
        {error && (
          <p role="alert" className="text-fold px-1 text-sm">
            {error}
          </p>
        )}
      </div>

      {/* For a visitor on their own (a recruiter trying the demo): how to play both seats. */}
      <p className="landscape-phone:col-start-1 landscape-phone:row-start-3 landscape-phone:self-start landscape-phone:justify-self-center text-muted max-w-[44ch] text-center text-xs text-balance [@media(orientation:landscape)_and_(max-height:520px)]:hidden">
        Trying it on your own? Create a table, then open the invite link in a private
        window and play both seats.
      </p>

      {/* A developer tool: only in `npm run dev`, never in the deployed site. */}
      {import.meta.env.DEV && (
        <div className="landscape-phone:col-span-2 text-muted text-center text-xs">
          <button
            type="button"
            onClick={testEmulator}
            className="underline underline-offset-4"
          >
            Test emulator connection
          </button>
          {pingResult && <p className="mt-2">{pingResult}</p>}
        </div>
      )}
    </main>
  )
}
