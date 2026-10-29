// Is the other player still at their screen?
// Pure: no React, no Firebase.
//
// Each open table screen checks in every HEARTBEAT_MS. If we haven't heard from someone for
// a few beats, they are "away": the tab was closed, the phone locked, or the connection died.

/** How often a screen checks in. */
export const HEARTBEAT_MS = 10_000

/** Silence longer than this (about two missed check-ins) means away. */
export const AWAY_AFTER_MS = 25_000

/**
 * `lastSeen` is the server's clock when the player last checked in. `serverNow` is the
 * server's clock right now, estimated by the caller (this computer's time plus the offset).
 * A player who has never checked in (no `lastSeen`) is not called away: we simply don't know.
 */
export function isAway(lastSeen: number | undefined, serverNow: number): boolean {
  if (lastSeen === undefined) return false
  return serverNow - lastSeen > AWAY_AFTER_MS
}
