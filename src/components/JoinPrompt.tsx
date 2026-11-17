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
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
      <div>
        <p className="text-muted text-sm">You’re invited to table</p>
        <h1 className="mt-1 text-6xl font-bold tracking-[0.16em]">{code}</h1>
      </div>
      <div className="panel flex w-full flex-col gap-3 rounded-[1.75rem] p-4 text-left sm:p-5">
        <label className="flex flex-col gap-1.5">
          <span className="px-1 text-sm font-medium">Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="What the table calls you"
            maxLength={20}
            autoComplete="nickname"
            className="field w-full"
          />
        </label>
        <button
          type="button"
          disabled={!playerName.trim() || busy}
          onClick={join}
          className="btn btn-gold w-full"
        >
          {busy ? 'Joining…' : 'Take a seat'}
        </button>
        {error && (
          <p role="alert" className="text-fold px-1 text-sm">
            {error}
          </p>
        )}
      </div>
      <Link to="/" className="text-muted text-sm underline-offset-4 hover:underline">
        Back to the lobby
      </Link>
    </main>
  )
}
