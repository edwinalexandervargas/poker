// Noticing that a newer version of the app was deployed. Pure: no React.

/** How often an open app checks for a new version (it also checks whenever it comes back on screen). */
export const UPDATE_CHECK_MS = 5 * 60_000

/**
 * Is there a newer build than the one running? `served` is what /version.json says now, or
 * null if it couldn't be read (offline, or an old deploy without the file): then we say no
 * rather than reload for nothing. In development there's nothing to update to.
 */
export function hasUpdate(running: string, served: string | null): boolean {
  if (running === 'dev' || !served) return false
  return served !== running
}
