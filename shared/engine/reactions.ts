// Emoji reactions players can send at the table. Pure: no React, no Firebase.

/** The only reactions allowed. A fixed list means nobody can post arbitrary text this way. */
export const REACTIONS = ['👍', '😂', '😮', '😬', '🔥', '🙏'] as const
export type Reaction = (typeof REACTIONS)[number]

/** One reaction per player this often, so nobody can flood the table. */
export const REACTION_COOLDOWN_MS = 1500

/** How long a reaction bubble stays over the seat. */
export const REACTION_SHOW_MS = 4000

/** Is this one of the allowed reactions? (Checks untrusted input from a browser.) */
export function isReaction(input: unknown): input is Reaction {
  return typeof input === 'string' && (REACTIONS as readonly string[]).includes(input)
}

/** May a player who last reacted at `lastAt` react again at `now`? */
export function canReactAgain(lastAt: number | undefined, now: number): boolean {
  return lastAt === undefined || now - lastAt >= REACTION_COOLDOWN_MS
}
