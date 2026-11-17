// Who is who at a glance: a colour and initials for each player.
// Pure: no React.

/**
 * Each seat has its own colour, used for that player everywhere: their avatar at the table, the
 * scoreboard and the chat. Eight hues that stay apart from each other and from the felt.
 */
export const SEAT_COLORS = [
  '#f5b83d', // brass
  '#6aa8ff', // blue
  '#f27fb8', // pink
  '#5fd8a8', // mint
  '#b294ff', // violet
  '#ff9a5c', // orange
  '#4fd2e8', // cyan
  '#e6e36a', // lime
] as const

export const seatColor = (seat: number) => SEAT_COLORS[seat % SEAT_COLORS.length]!

/** Up to two letters: "Maya" → "M", "Jordan Lee" → "JL". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0]!.slice(0, 1).toUpperCase()
  return (words[0]![0]! + words.at(-1)![0]!).toUpperCase()
}
