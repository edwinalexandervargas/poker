import type { HandResult, Seat } from '@shared/engine'

/**
 * The sentence shown when a hand ends, written from the point of view of the person
 * looking at the screen ("You win 200..." for them, "Bob wins 200..." for anyone else).
 * Pure: no React, so it is easy to test.
 *
 * `names[seat]` is each seat's player name.
 */
export function describeResult(
  result: HandResult,
  mySeat: Seat,
  names: Partial<Record<Seat, string>>,
): string {
  const name = (seat: Seat) => (seat === mySeat ? 'You' : (names[seat] ?? 'Player'))
  const withHand = result.handName ? ` with ${result.handName}` : ''
  const pots = result.pots ?? [{ amount: 0, winners: result.winners }]

  if (result.reason === 'fold') {
    const winner = result.winners[0]!
    const verb = winner === mySeat ? 'win' : 'wins'
    return `${name(winner)} ${verb} ${result.payouts[winner]} (everyone else folded)`
  }

  // One pot (nobody was all-in for less): say who won it.
  if (pots.length === 1) {
    if (result.winners.length === 1) {
      const winner = result.winners[0]!
      const verb = winner === mySeat ? 'win' : 'wins'
      return `${name(winner)} ${verb} ${result.payouts[winner]}${withHand}`
    }
    const amounts = result.winners.map((seat) => result.payouts[seat]!)
    if (amounts.every((a) => a === amounts[0])) {
      return `Split pot: ${amounts[0]} each${withHand}`
    }
    const parts = result.winners.map(
      (seat) =>
        `${name(seat)} ${seat === mySeat ? 'get' : 'gets'} ${result.payouts[seat]}`,
    )
    return `Split pot: ${parts.join(', ')}${withHand}`
  }

  // Side pots: one short part per pot. The hand name belongs to the main pot's winner.
  const parts = pots.map((pot, i) => {
    const label = i === 0 ? 'Main pot' : pots.length > 2 ? `Side pot ${i}` : 'Side pot'
    const who = pot.winners.map(name).join(' & ')
    const hand = i === 0 && result.handName ? ` (${result.handName})` : ''
    return `${label} ${pot.amount}: ${who}${hand}`
  })
  return parts.join(' · ')
}
