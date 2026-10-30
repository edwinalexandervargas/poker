// What you have, and roughly how good it is. Pure game logic: no React, no Firebase.
//
// The server works these out for each player privately (only that player can read them).
// The estimate NEVER looks at the real deck: the server knows the coming cards, and using them
// would leak the future (a bar jumping to 100% before the river). Instead it imagines every
// unseen card as possible, which is exactly what a player has to do.

import pokersolver from 'pokersolver'
import { createDeck, type RandomInt } from './deck.js'
import type { Card } from './types.js'

const { Hand } = pokersolver

const RANK_NAME: Record<string, [string, string]> = {
  A: ['Ace', 'Aces'],
  K: ['King', 'Kings'],
  Q: ['Queen', 'Queens'],
  J: ['Jack', 'Jacks'],
  T: ['Ten', 'Tens'],
  '9': ['Nine', 'Nines'],
  '8': ['Eight', 'Eights'],
  '7': ['Seven', 'Sevens'],
  '6': ['Six', 'Sixes'],
  '5': ['Five', 'Fives'],
  '4': ['Four', 'Fours'],
  '3': ['Three', 'Threes'],
  '2': ['Two', 'Twos'],
}
const ORDER = 'AKQJT98765432'

/**
 * A short name for what you're holding. Before the flop it describes the two cards
 * ("Pair of Aces", "Ace-King suited"); after, the best five-card hand ("Two Pair, K's & 7's").
 */
export function handLabel(hole: readonly Card[], community: readonly Card[]): string {
  if (hole.length !== 2) return ''
  if (community.length === 0) {
    const [a, b] = [...hole].sort((x, y) => ORDER.indexOf(x[0]!) - ORDER.indexOf(y[0]!))
    const [ra, rb] = [a![0]!, b![0]!]
    if (ra === rb) return `Pair of ${RANK_NAME[ra]![1]}`
    const suited = a![1] === b![1] ? 'suited' : 'offsuit'
    return `${RANK_NAME[ra]![0]}-${RANK_NAME[rb]![0]} ${suited}`
  }
  return Hand.solve([...hole, ...community]).descr
}

export interface EquityInput {
  hole: readonly Card[]
  community: readonly Card[]
  /** Players still in the hand besides you. */
  opponents: number
  /** How many random run-outs to try. More is steadier and slower. */
  iterations: number
  randomInt: RandomInt
}

/**
 * Your share of the pot on average, from 0 to 1, if everyone still in went to showdown:
 * deal the opponents random cards and finish the board at random, many times, and count
 * wins (a tie counts as your share of it). A rough guide, not a promise.
 */
export function estimateEquity({
  hole,
  community,
  opponents,
  iterations,
  randomInt,
}: EquityInput): number {
  if (opponents <= 0) return 1
  const known = new Set<string>([...hole, ...community])
  const unseen = createDeck().filter((card) => !known.has(card))
  const needed = opponents * 2 + (5 - community.length)

  let won = 0
  for (let run = 0; run < iterations; run++) {
    // Partial shuffle: only the cards this run needs.
    const pool = [...unseen]
    for (let i = 0; i < needed; i++) {
      const j = i + randomInt(pool.length - i)
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    const board = [...community, ...pool.slice(opponents * 2, needed)]
    const mine = Hand.solve([...hole, ...board])
    const theirs = Array.from({ length: opponents }, (_, k) =>
      Hand.solve([pool[k * 2]!, pool[k * 2 + 1]!, ...board]),
    )
    const winners = Hand.winners([mine, ...theirs])
    if (winners.includes(mine)) won += 1 / winners.length
  }
  return won / iterations
}

/** How many run-outs to try so the work stays about the same at any table size. */
export function equityIterations(
  players: number,
  opponents: number,
  budget = 6000,
): number {
  return Math.max(60, Math.min(1500, Math.floor(budget / (players * (opponents + 1)))))
}

export interface NutStrength {
  /** 0 to 1: the share of hands an opponent could hold that yours beats (ties count half). */
  score: number
  /** How many possible opponent hands beat yours right now. 0 means you have the nuts. */
  better: number
  /** How many two-card hands an opponent could hold, given the cards you can see. */
  total: number
}

/**
 * How close your hand is to the best possible hand ("the nuts") on this board, right now.
 * Exact, not a simulation: it tries every two cards an opponent could hold (1,081 on the flop,
 * fewer later) and counts how many beat yours. Like the equity estimate it only uses cards you
 * can see. Null before the flop, when there's no board to have the nuts on.
 */
export function nutStrength(
  hole: readonly Card[],
  community: readonly Card[],
): NutStrength | null {
  if (hole.length !== 2 || community.length < 3) return null
  const known = new Set<string>([...hole, ...community])
  const unseen = createDeck().filter((card) => !known.has(card))
  const mine = Hand.solve([...hole, ...community])

  let better = 0
  let tied = 0
  let total = 0
  for (let i = 0; i < unseen.length; i++) {
    for (let j = i + 1; j < unseen.length; j++) {
      const theirs = Hand.solve([unseen[i]!, unseen[j]!, ...community])
      const winners = Hand.winners([mine, theirs])
      total++
      if (winners.length === 2) tied++
      else if (winners[0] === theirs) better++
    }
  }
  return { score: (total - better - tied / 2) / total, better, total }
}
