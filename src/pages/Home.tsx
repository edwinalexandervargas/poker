import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { httpsCallable } from 'firebase/functions'
import { Card } from '@/components/Card'
import { functions } from '@/lib/firebase'
import { useUiStore } from '@/store/ui'
import type { Card as CardCode } from '@shared/engine'

const DEMO_FLOP: CardCode[] = ['As', 'Kd', '7h']

export default function Home() {
  const navigate = useNavigate()
  const { playerName, setPlayerName } = useUiStore()
  const [code, setCode] = useState('')
  const [flopUp, setFlopUp] = useState(false)
  const [pingResult, setPingResult] = useState<string | null>(null)

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
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center gap-8 px-4 py-10">
      <h1 className="text-4xl font-bold tracking-tight">Heads-Up Poker</h1>

      {/* Card flip demo: click to deal the flop */}
      <button
        type="button"
        onClick={() => setFlopUp((v) => !v)}
        className="flex gap-3 rounded-xl p-2 focus:ring-2 focus:ring-white/60 focus:outline-none"
        aria-label="Flip the demo flop"
      >
        {DEMO_FLOP.map((card, i) => (
          <Card key={card} card={card} faceUp={flopUp} delay={i * 0.15} />
        ))}
      </button>

      <div className="flex w-full flex-col gap-3">
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your name"
          maxLength={20}
          className="rounded-lg bg-white/10 px-4 py-3 placeholder:text-white/50 focus:ring-2 focus:ring-white/60 focus:outline-none"
        />
        <button
          type="button"
          disabled={!playerName.trim()}
          onClick={() => navigate('/room/demo')}
          className="bg-chip-gold rounded-lg px-4 py-3 font-semibold text-black disabled:opacity-40"
        >
          Create table
        </button>
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Room code"
            maxLength={6}
            className="min-w-0 flex-1 rounded-lg bg-white/10 px-4 py-3 tracking-widest uppercase placeholder:tracking-normal placeholder:text-white/50 focus:ring-2 focus:ring-white/60 focus:outline-none"
          />
          <button
            type="button"
            disabled={!playerName.trim() || code.length < 4}
            onClick={() => navigate(`/room/${code}`)}
            className="rounded-lg bg-white/15 px-4 py-3 font-semibold disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </div>

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
    </main>
  )
}
