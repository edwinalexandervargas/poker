// The action log: short lines like "Alex raises to 80" or "Flop: A♠ K♦ 7♥".
// Pure game logic: no React, no Firebase. The server works the lines out from the hand
// before and after each move, so the log can never disagree with what actually happened.

import { getLegalActions } from './actions.js'
import type { HandState } from './hand.js'
import type { Action, Card, Seat } from './types.js'

/** A seat's player name. */
export type NameOf = (seat: Seat) => string

const SUIT_SYMBOL: Record<string, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }

/** "As" becomes "A♠", "Td" becomes "10♦". */
export function cardText(card: Card): string {
  const rank = card[0] === 'T' ? '10' : card[0]!
  return `${rank}${SUIT_SYMBOL[card[1]!]}`
}

const cardsText = (cards: readonly Card[]) => cards.map(cardText).join(' ')

/** Lines for the start of a hand: who has the button and who posted the blinds. */
export function describeStart(hand: HandState, name: NameOf): string[] {
  const lines = [`Hand ${hand.handNumber}: ${name(hand.button)} has the button`]
  // The two blinds are the only bets at the start of a hand. Small blind first.
  const posted = hand.bets
    .map((bet, seat) => ({ bet, seat }))
    .filter(({ bet }) => bet > 0)
    .sort((a, b) => a.bet - b.bet)
  for (const { bet, seat } of posted) lines.push(`${name(seat)} posts ${bet}`)
  return lines
}

/**
 * Lines for one move: what the player did, then any board cards that came out because of it.
 * `before` is the hand when the move was made, `after` the hand once it was applied.
 */
export function describeMove(
  before: HandState,
  action: Action,
  after: HandState,
  bigBlind: number,
  name: NameOf,
): string[] {
  const seat = before.toAct!
  const who = name(seat)
  const legal = getLegalActions(before, bigBlind)
  const lines: string[] = []

  // How many chips left the player's stack with this move.
  const put =
    action.type === 'call'
      ? (legal?.callAmount ?? 0)
      : action.type === 'raise'
        ? action.amount - before.bets[seat]!
        : 0
  const allIn = put > 0 && put === before.stacks[seat]

  switch (action.type) {
    case 'fold':
      lines.push(`${who} folds`)
      break
    case 'check':
      lines.push(`${who} checks`)
      break
    case 'call':
      lines.push(allIn ? `${who} calls ${put} and is all-in` : `${who} calls ${put}`)
      break
    case 'raise': {
      const verb = Math.max(...before.bets) === 0 ? 'bets' : 'raises to'
      lines.push(
        allIn
          ? `${who} ${verb} ${action.amount} and is all-in`
          : `${who} ${verb} ${action.amount}`,
      )
      break
    }
  }
  lines.push(...describeBoard(before.community, after.community))
  return lines
}

/** Lines for new board cards: the flop together, then the turn and river one at a time. */
export function describeBoard(before: readonly Card[], after: readonly Card[]): string[] {
  const lines: string[] = []
  if (before.length < 3 && after.length >= 3)
    lines.push(`Flop: ${cardsText(after.slice(0, 3))}`)
  if (before.length < 4 && after.length >= 4) lines.push(`Turn: ${cardText(after[3]!)}`)
  if (before.length < 5 && after.length >= 5) lines.push(`River: ${cardText(after[4]!)}`)
  return lines
}

/** Lines for the end of a hand: cards shown at a showdown, and who won each pot. */
export function describeEnd(hand: HandState, name: NameOf): string[] {
  const result = hand.result
  if (!result) return []
  if (result.reason === 'fold') {
    const winner = result.winners[0]!
    return [`${name(winner)} wins ${result.payouts[winner]} (everyone else folded)`]
  }

  const lines: string[] = []
  hand.holeCards.forEach((cards, seat) => {
    if (cards.length > 0 && !hand.folded[seat]) {
      lines.push(`${name(seat)} shows ${cardsText(cards)}`)
    }
  })
  result.pots.forEach((pot, i) => {
    const who = pot.winners.map(name).join(' and ')
    const verb = pot.winners.length > 1 ? 'split' : 'wins'
    const which =
      result.pots.length === 1 ? '' : i === 0 ? ' the main pot' : ' a side pot'
    const hand = i === 0 && result.handName ? ` with ${result.handName}` : ''
    lines.push(`${who} ${verb}${which} (${pot.amount})${hand}`)
  })
  return lines
}
