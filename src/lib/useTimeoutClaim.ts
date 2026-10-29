import { useEffect } from 'react'
import { claimTimeout } from '@/lib/api'
import { msLeft, type TurnClock } from '@/lib/turnClock'

// Wait a moment past the deadline before asking, so our clock estimate can't make us early.
const CLAIM_DELAY_MS = 500
const RETRY_MS = 1500
const MAX_RETRIES = 2

/**
 * When the clock runs out, ask the server to play the automatic move.
 * Both players' screens do this, so a player who closed the tab can't stall the table.
 * Whichever call reaches the server first wins; the other is refused, and that is fine,
 * so errors are ignored. The server is the one that checks the deadline.
 */
export function useTimeoutClaim(code: string, turn: TurnClock | null, online = true) {
  const deadline = turn?.deadline ?? null
  const totalMs = turn?.totalMs ?? 0
  const clockOffset = turn?.clockOffset ?? 0

  useEffect(() => {
    // Offline, a request can't get through. When we come back online this runs again, so a
    // deadline that passed while we were away is claimed straight away.
    if (deadline === null || !online) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    async function claim(retriesLeft: number) {
      try {
        await claimTimeout(code)
      } catch {
        if (!cancelled && retriesLeft > 0) {
          timer = setTimeout(() => claim(retriesLeft - 1), RETRY_MS)
        }
      }
    }

    const wait = msLeft({ deadline, totalMs, clockOffset }, Date.now()) + CLAIM_DELAY_MS
    timer = setTimeout(() => claim(MAX_RETRIES), wait)

    // A new turn (new deadline) cancels this one.
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [code, deadline, totalMs, clockOffset, online])
}
