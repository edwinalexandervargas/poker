// Table chat rules. Pure: no React, no Firebase. The server enforces them; the screen uses
// them to grey out the send button.

/** The longest message allowed. */
export const MAX_CHAT_LENGTH = 200

/** One message per player this often, so nobody can flood the table. */
export const CHAT_COOLDOWN_MS = 1000

/** How many recent messages a screen keeps. */
export const CHAT_HISTORY = 50

// Control and invisible formatting characters. Matching them is the point, so the lint rule
// against control characters in patterns is switched off for this one line.
const INVISIBLE = new RegExp(
  // oxlint-disable-next-line no-control-regex
  '[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2060-\\u206f]',
  'g',
)

/**
 * Tidies a message a browser sent: trims it, collapses runs of spaces and line breaks, and
 * removes invisible control characters. Returns null if nothing is left, it's too long, or
 * it isn't text at all.
 */
export function cleanChatText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const text = input
    // Control characters and invisible formatting characters (zero-width spaces, direction
    // marks), which could hide text or garble the layout. Written as escapes on purpose.
    .replace(INVISIBLE, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length === 0 || text.length > MAX_CHAT_LENGTH) return null
  return text
}

/** May a player who last chatted at `lastAt` send another message at `now`? */
export function canChatAgain(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || now - lastAt >= CHAT_COOLDOWN_MS
}

/** One chat message, as stored at rooms/{code}/chat/{id}. */
export interface ChatMessage {
  /** The sender's seat and name when they sent it. */
  seat: number
  name: string
  text: string
  /** Server clock (ms). Also what messages are sorted by. */
  at: number
}
