import { useEffect, useState } from 'react'
import { hasUpdate, UPDATE_CHECK_MS } from '@/lib/updates'

/** The version the server is serving right now, or null if it can't be read. */
async function servedVersion(): Promise<string | null> {
  try {
    // no-store: always ask the server, never a cached copy.
    const response = await fetch('/version.json', { cache: 'no-store' })
    if (!response.ok) return null
    const data = (await response.json()) as { version?: unknown }
    return typeof data.version === 'string' ? data.version : null
  } catch {
    return null
  }
}

/**
 * True once a newer version has been deployed than the one running. Checks when the app comes
 * back on screen (an installed phone app is usually resumed, not restarted) and every few
 * minutes while it's open. Each check is one tiny file from Firebase Hosting.
 */
export function useUpdateCheck(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (__APP_VERSION__ === 'dev') return
    let cancelled = false

    const check = async () => {
      if (document.visibilityState !== 'visible') return
      const served = await servedVersion()
      if (!cancelled && hasUpdate(__APP_VERSION__, served)) setAvailable(true)
    }

    void check()
    const timer = setInterval(check, UPDATE_CHECK_MS)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('focus', check)
    return () => {
      cancelled = true
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('focus', check)
    }
  }, [])

  return available
}
