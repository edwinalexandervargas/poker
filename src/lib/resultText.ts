import type { HandResult, Seat } from '@shared/engine'

/**
 * The sentence shown when a hand ends, written from the point of view of the person
 * looking at the screen ("You win 200..." for them, "Bob wins 200..." for the other).
 * Pure: no React, so it is easy to test.
 */
export function describeResult(
  result: HandResult,
  mySeat: Seat,
  names: [string, string],
): string {
  const withHand = result.handName ? ` with ${result.handName}` : ''

  // Two winners means the pot was split.
  if (result.winners.length === 2) {
    const [a, b] = result.payouts
    return a === b
      ? `Split pot: ${a} each${withHand}`
      : `Split pot: ${names[0]} gets ${a}, ${names[1]} gets ${b}${withHand}`
  }

  const winner = result.winners[0]!
  const amount = result.payouts[winner]
  const who = winner === mySeat ? 'You' : names[winner]
  const verb = winner === mySeat ? 'win' : 'wins'

  if (result.reason === 'fold') {
    const loser: Seat = winner === 0 ? 1 : 0
    const loserText = loser === mySeat ? 'you' : names[loser]
    return `${who} ${verb} ${amount} (${loserText} folded)`
  }
  return `${who} ${verb} ${amount}${withHand}`
}
