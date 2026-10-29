// Turning the action log into a list of past hands. Pure: no React, no Firebase.

import type { LogLine } from '@/lib/useEvents'

export interface HandRecord {
  handNumber: number
  /** The hand's lines, in order. */
  lines: string[]
  /** The hand's last line that says who won, if it finished. */
  summary: string | null
}

/**
 * Groups log lines (oldest first) into hands, newest hand first. Lines that belong to no
 * hand ("Dan sits down", rebuys) stay with the hand they happened during or after.
 */
export function groupByHand(lines: readonly LogLine[]): HandRecord[] {
  const hands: HandRecord[] = []
  for (const line of lines) {
    const current = hands.at(-1)
    if (line.handNumber > 0 && line.handNumber !== current?.handNumber) {
      hands.push({ handNumber: line.handNumber, lines: [line.text], summary: null })
    } else if (current) {
      current.lines.push(line.text)
    }
    const hand = hands.at(-1)
    if (hand && / (wins|split) /.test(line.text)) hand.summary = line.text
  }
  return hands.reverse()
}
