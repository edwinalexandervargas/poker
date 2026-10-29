import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { normalizeRoomCode } from '@shared/engine/room'
import type { Card as CardCode } from '@shared/engine'
import { Card } from '@/components/Card'
import { createRoom, errorMessage, joinRoom } from '@/lib/api'
import { functions } from '@/lib/firebase'
import { useUiStore } from '@/store/ui'

const DEMO_FLOP: CardCode[] = ['As', 'Kd', '7h']

export default function Home() {
  // Fetch the table page in the background while the lobby is open, so it is already
  // cached by the time you create or join a room.
  useEffect(() => {
    void import('@/pages/Room')
  }, [])

  const navigate = useNavigate()
  const { playerName, setPlayerName } = useUiStore()
  const [code, setCode] = useState('')
  const [flopUp, setFlopUp] = useState(false)
  const [pingResult, setPingResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasName = playerName.trim().length > 0
  const normalizedCode = normalizeRoomCode(code)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      navigate(`/room/${await createRoom(playerName)}`)
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
    <main className="landscape-phone:max-w-4xl landscape-phone:grid landscape-phone:grid-cols-2 landscape-phone:content-center landscape-phone:gap-x-10 landscape-phone:gap-y-5 mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-8 px-4 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="landscape-phone:col-start-1 text-center">
        <h1 className="landscape-phone:text-4xl text-5xl font-extrabold tracking-[-0.04em]">
          Poker Table
        </h1>
        <p className="mt-2 text-white/60">
          Texas Hold’em with friends. Up to 8 players, play money.
        </p>
      </div>

      {/* Card flip demo: click to deal the flop */}
      <button
        type="button"
        onClick={() => setFlopUp((v) => !v)}
        className="landscape-phone:col-start-1 landscape-phone:row-start-2 landscape-phone:justify-self-center flex gap-3 rounded-xl p-2 focus:ring-2 focus:ring-white/60 focus:outline-none"
        aria-label="Flip the demo flop"
      >
        {DEMO_FLOP.map((card, i) => (
          <Card key={card} card={card} faceUp={flopUp} delay={i * 0.15} />
        ))}
      </button>

      <div className="landscape-phone:col-start-2 landscape-phone:row-span-2 landscape-phone:row-start-1 landscape-phone:self-center flex w-full flex-col gap-3">
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="field"
        />
        <button
          type="button"
          disabled={!hasName || busy}
          onClick={handleCreate}
          className="btn btn-gold"
        >
          {busy ? 'Working…' : 'Create table'}
        </button>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Table code"
            maxLength={6}
            className="field min-w-0 flex-1 tracking-widest uppercase placeholder:tracking-normal"
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
        {error && (
          <p role="alert" className="text-center text-red-300">
            {error}
          </p>
        )}
      </div>

      {/* A developer tool: only in `npm run dev`, never in the deployed site. */}
      {import.meta.env.DEV && (
        <div className="text-center text-sm text-white/70">
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
