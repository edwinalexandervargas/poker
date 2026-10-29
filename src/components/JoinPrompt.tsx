import { useState } from 'react'
import { Link } from 'react-router-dom'
import { errorMessage, joinRoom } from '@/lib/api'
import { useUiStore } from '@/store/ui'

interface JoinPromptProps {
  code: string
}

/** For someone who opened an invite link but isn't seated yet. */
export function JoinPrompt({ code }: JoinPromptProps) {
  const { playerName, setPlayerName } = useUiStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function join() {
    setBusy(true)
    setError(null)
    try {
      await joinRoom(code, playerName)
      // Nothing to do on success: the live table updates and Room shows the next screen.
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <p className="text-sm tracking-widest text-white/60 uppercase">Join table</p>
      <h1 className="text-5xl font-bold tracking-[0.3em]">{code}</h1>
      <input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="Your name"
        maxLength={20}
        className="field w-full"
      />
      <button
        type="button"
        disabled={!playerName.trim() || busy}
        onClick={join}
        className="btn btn-gold w-full"
      >
        {busy ? 'Joining…' : 'Join table'}
      </button>
      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
      <Link to="/" className="text-sm underline underline-offset-4">
        Back to lobby
      </Link>
    </main>
  )
}
