// Test helper: builds a full HandState from the short heads-up fixtures the original tests
// were written with. The engine now tracks more per player (committed, folded, acted), so
// this fills those in from what a heads-up fixture already says.

import type { HandState } from './hand.js'

/** A heads-up fixture: a HandState, optionally with the old "moves this round" counter. */
export type HeadsUpFixture = Omit<HandState, 'committed' | 'folded' | 'acted'> &
  Partial<Pick<HandState, 'committed' | 'folded' | 'acted'>> & {
    actionsThisRound?: number
  }

export function headsUp(fixture: HeadsUpFixture): HandState {
  const { actionsThisRound = 0, ...hand } = fixture
  const count = hand.stacks.length
  // Moves made this round. Heads-up, one move means the player NOT to act has just acted;
  // two or more means both have.
  const acted =
    fixture.acted ??
    hand.stacks.map((_, seat) =>
      actionsThisRound >= 2 ? true : actionsThisRound === 1 ? seat !== hand.toAct : false,
    )
  const folded = fixture.folded ?? hand.stacks.map(() => false)
  // Earlier rounds' pot came equally from both players (as it does when bets are matched).
  const committed =
    fixture.committed ??
    hand.bets.map(
      (bet, seat) =>
        bet + Math.floor(hand.pot / count) + (seat < hand.pot % count ? 1 : 0),
    )
  return { ...hand, acted, folded, committed }
}
