// Is a player still at their screen? Pure: no React, no Firebase.
// Shared by the screens (to show "away") and the server (to stop waiting for them).
//
// Two signals:
//   - lastSeen: each open table screen checks in every HEARTBEAT_MS. Long silence means the
//     tab died, the phone lost signal, or the computer slept.
//   - leftAt: when a screen is hidden or closed, it tells the server straight away. That's
//     faster, but it also happens when someone just glances at a text, so it gets a grace
//     period before we stop waiting for them.

/** How often a screen checks in. */
export const HEARTBEAT_MS = 5_000

/** Silence longer than this (about two missed check-ins) means the player has gone. */
export const AWAY_AFTER_MS = 12_000

/** How long after leaving the screen before the table stops waiting for them. */
export const LEFT_GRACE_MS = 8_000

export interface Presence {
  /** Server clock (ms) at their last check-in. Missing until the first one. */
  lastSeen?: number
  /** Server clock (ms) when their screen was hidden or closed. Null once they're back. */
  leftAt?: number | null
}

/** Show them as "away": they've left the screen, or we've heard nothing for too long. */
export function isAway(player: Presence, serverNow: number): boolean {
  if (player.leftAt != null) return true
  if (player.lastSeen === undefined) return false
  return serverNow - player.lastSeen > AWAY_AFTER_MS
}

/**
 * Gone for long enough that the table should stop waiting: their turn can be played for them
 * (check or fold) right away, and they sit out new hands until they're back.
 */
export function isGone(player: Presence, serverNow: number): boolean {
  if (player.leftAt != null && serverNow - player.leftAt >= LEFT_GRACE_MS) return true
  if (player.lastSeen === undefined) return false
  return serverNow - player.lastSeen > AWAY_AFTER_MS
}
