// Counting unread chat messages. Pure: no React.

/** Messages from other players that arrived after `readUpTo`. Your own never count. */
export function countUnread(
  messages: readonly { seat: number; at: number }[],
  mySeat: number,
  readUpTo: number,
): number {
  return messages.filter((m) => m.seat !== mySeat && m.at > readUpTo).length
}
