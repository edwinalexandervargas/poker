import { useEffect, useState, useSyncExternalStore } from 'react'
import { heartbeat } from '@/lib/api'
import { HEARTBEAT_MS } from '@/lib/presence'

function subscribeToOnline(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** True while the browser believes it has a network connection. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeToOnline,
    () => navigator.onLine,
    () => true,
  )
}

/**
 * Keeps telling the server "I'm still here" while the table is open, so the other player's
 * screen can show when we've gone away. Also reports whether we are online, and how far this
 * computer's clock is from the server's (needed to judge the other player's last check-in).
 *
 * It checks in straight away when the tab becomes visible again, because phones freeze timers
 * in background tabs, and says goodbye when the tab is hidden or closed.
 */
export function usePresence(code: string) {
  const online = useOnline()
  const [clockOffset, setClockOffset] = useState(0)

  useEffect(() => {
    if (!online) return

    let cancelled = false

    async function beat() {
      // A hidden tab stays quiet, so a regular check-in can't cancel its goodbye.
      if (document.visibilityState === 'hidden') return
      try {
        const sentAt = Date.now()
        const serverNow = await heartbeat(code)
        const receivedAt = Date.now()
        // The server stamped its clock about halfway through the round trip.
        if (!cancelled) setClockOffset(serverNow - (sentAt + receivedAt) / 2)
      } catch {
        // A missed beat is fine. The next one tries again.
      }
    }

    // Say goodbye when the screen is hidden or closed, so the others see it at once. It's best
    // effort: a closing tab may not get the request out, and then the silence gives us away.
    const leave = () => void heartbeat(code, true).catch(() => {})

    void beat()
    const timer = setInterval(beat, HEARTBEAT_MS)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void beat()
      else leave()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', leave)

    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', leave)
    }
  }, [code, online])

  return { online, clockOffset }
}

/** The current time, refreshed every `everyMs`, so things like "away" can appear by themselves. */
export function useNow(everyMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}
