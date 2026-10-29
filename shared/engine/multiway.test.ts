import { describe, expect, it } from 'vitest'
import { applyAction } from './apply.js'
import { getLegalActions } from './actions.js'
import { createDeck } from './deck.js'
import { startHand, type HandState } from './hand.js'
import { nextButton, nextHand } from './nexthand.js'
import { playTurn } from './playTurn.js'
import type { Card } from './types.js'

// Full-table play: 3 to 8 players.

const BB = 20

function sixHanded(
  overrides: { stacks?: number[]; button?: number; deck?: Card[] } = {},
) {
  return startHand({
    handNumber: 1,
    button: overrides.button ?? 0,
    stacks: overrides.stacks ?? [1000, 1000, 1000, 1000, 1000, 1000],
    smallBlind: 10,
    bigBlind: BB,
    deck: overrides.deck ?? createDeck(),
  })
}

/** Plays a list of moves, each by whoever is to act. */
function play(hand: HandState, ...moves: string[]): HandState {
  for (const move of moves) {
    const [type, amount] = move.split(' ')
    const action =
      type === 'raise'
        ? { type: 'raise' as const, amount: Number(amount) }
        : { type: type as 'call' }
    hand = playTurn(hand, hand.toAct!, action, BB).state
  }
  return hand
}

describe('starting a 6-handed hand', () => {
  it('the two players after the button post the blinds', () => {
    const hand = sixHanded()
    expect(hand.bets).toEqual([0, 10, 20, 0, 0, 0])
  })

  it('the player after the big blind acts first', () => {
    expect(sixHanded().toAct).toBe(3)
  })

  it('deals two cards to everyone, starting after the button', () => {
    const deck = createDeck()
    const hand = sixHanded({ deck })
    // first card to seat 1, then 2, 3, 4, 5, 0, then around again
    expect(hand.holeCards[1]).toEqual([deck[0], deck[6]])
    expect(hand.holeCards[0]).toEqual([deck[5], deck[11]])
    expect(hand.deck).toHaveLength(52 - 12)
  })

  it('empty seats get no cards and are skipped', () => {
    const hand = sixHanded({ stacks: [1000, 0, 1000, 0, 1000, 1000] })
    expect(hand.holeCards[1]).toEqual([])
    expect(hand.folded).toEqual([false, true, false, true, false, false])
    // button 0: small blind is seat 2, big blind seat 4, seat 5 acts first
    expect(hand.bets).toEqual([0, 0, 10, 0, 20, 0])
    expect(hand.toAct).toBe(5)
  })
})

describe('a betting round with several players', () => {
  it('everyone calls, the big blind checks: the flop comes, first player after the button acts', () => {
    // seats 3, 4, 5, 0 call, the small blind (1) completes, the big blind (2) checks
    const hand = play(sixHanded(), 'call', 'call', 'call', 'call', 'call', 'check')
    expect(hand.phase).toBe('flop')
    expect(hand.pot).toBe(120)
    expect(hand.toAct).toBe(1)
  })

  it('the round is not over until the big blind has had its option', () => {
    const hand = play(sixHanded(), 'call', 'call', 'call', 'call', 'call')
    // every bet is now 20, but the big blind hasn't acted yet
    expect(hand.bets).toEqual([20, 20, 20, 20, 20, 20])
    expect(hand.phase).toBe('preflop')
    expect(hand.toAct).toBe(2)
  })

  it('a raise gives everyone who already called another turn', () => {
    // seats 3, 4 call; seat 5 raises: 3 and 4 must act again before the flop
    let hand = play(sixHanded(), 'call', 'call', 'raise 80', 'fold', 'fold', 'fold')
    expect(hand.toAct).toBe(3)
    hand = play(hand, 'call', 'call')
    expect(hand.phase).toBe('flop')
    expect(hand.pot).toBe(80 * 3 + 10 + 20)
  })

  it('folded players are skipped for the rest of the hand', () => {
    const hand = play(sixHanded(), 'fold', 'fold', 'call', 'call', 'call', 'check')
    expect(hand.phase).toBe('flop')
    expect(hand.toAct).toBe(1)
    const after = play(hand, 'check', 'check')
    // seats 3 and 4 folded, so seat 5 is next after seat 2
    expect(after.toAct).toBe(5)
  })

  it('when everyone else folds, the last player wins at once without a showdown', () => {
    const hand = play(sixHanded(), 'raise 60', 'fold', 'fold', 'fold', 'fold', 'fold')
    expect(hand.phase).toBe('complete')
    expect(hand.result?.reason).toBe('fold')
    expect(hand.result?.winners).toEqual([3])
    expect(hand.stacks[3]).toBe(1000 + 10 + 20)
  })
})

describe('raising limits with several players', () => {
  it('you can bet up to what the biggest other stack can match', () => {
    // seat 3 has 5000; nobody else has more than 1000
    const hand = sixHanded({ stacks: [1000, 1000, 1000, 5000, 1000, 1000] })
    expect(getLegalActions(hand, BB)?.maxRaiseTo).toBe(1000)
  })

  it('folded players do not count', () => {
    const hand = play(sixHanded({ stacks: [1000, 1000, 1000, 300, 5000, 300] }), 'fold')
    // seat 4 has 5000; the others still in have at most 1000
    expect(getLegalActions(hand, BB)?.maxRaiseTo).toBe(1000)
  })
})

describe('all-ins and side pots', () => {
  // Seats 0-2 only. Fixed cards so we know who wins:
  //   seat 0: A A (best)   seat 1: K K (second)   seat 2: Q Q (worst)   board: 2 7 9 J 4
  const deck: Card[] = [
    'Ks',
    'Qs',
    'As', // first card: seats 1, 2, 0 (button 0)
    'Kd',
    'Qd',
    'Ad', // second card
    '2c',
    '7h',
    '9d',
    'Jc',
    '4s',
    ...createDeck().filter(
      (c) =>
        !['Ks', 'Qs', 'As', 'Kd', 'Qd', 'Ad', '2c', '7h', '9d', 'Jc', '4s'].includes(c),
    ),
  ]

  it('the short stack wins only the main pot; the side pot goes to the next best hand', () => {
    // seat 0 (aces) has only 100; seats 1 and 2 have 500
    let hand = startHand({
      handNumber: 1,
      button: 0,
      stacks: [100, 500, 500],
      smallBlind: 10,
      bigBlind: BB,
      deck,
    })
    // preflop: seat 0 shoves 100, seat 1 raises to 500, seat 2 calls 500
    hand = play(hand, 'raise 100', 'raise 500', 'call')
    expect(hand.phase).toBe('complete')
    expect(hand.result?.pots).toEqual([
      { amount: 300, winners: [0] }, // everyone's first 100: aces win
      { amount: 800, winners: [1] }, // the rest between seats 1 and 2: kings win
    ])
    expect(hand.stacks).toEqual([300, 800, 0])
  })

  it('a bet nobody could call comes back before the showdown', () => {
    // seat 0 shoves 100, seat 1 shoves 500, seat 2 folds: 400 of seat 1's bet is uncalled
    let hand = startHand({
      handNumber: 1,
      button: 0,
      stacks: [100, 500, 500],
      smallBlind: 10,
      bigBlind: BB,
      deck,
    })
    hand = play(hand, 'raise 100', 'raise 500', 'fold')
    expect(hand.phase).toBe('complete')
    // main pot: 100 + 100 + seat 2's dead big blind 20 = 220, aces win it
    expect(hand.result?.pots).toEqual([{ amount: 220, winners: [0] }])
    expect(hand.stacks).toEqual([220, 400, 480])
  })

  it('with only one player left who has chips, the board runs out', () => {
    let hand = startHand({
      handNumber: 1,
      button: 0,
      stacks: [100, 100, 1000],
      smallBlind: 10,
      bigBlind: BB,
      deck,
    })
    hand = play(hand, 'raise 100', 'call')
    // seat 2 (big blind) is the only one with chips left; it still has a bet to answer
    expect(hand.toAct).toBe(2)
    hand = play(hand, 'call')
    expect(hand.phase).toBe('complete')
    expect(hand.community).toHaveLength(5)
  })
})

describe('moving to the next hand', () => {
  it('the button moves to the next player with chips', () => {
    expect(nextButton(0, [1000, 0, 1000, 1000])).toBe(2)
    expect(nextButton(3, [1000, 0, 1000, 1000])).toBe(0)
  })

  it('a busted player sits out; the game goes on while two or more have chips', () => {
    const finished = { ...sixHanded(), phase: 'complete' as const, toAct: null }
    const stacks = [0, 1500, 0, 1500, 0, 0]
    const next = nextHand(finished, 10, BB, createDeck(), stacks)!
    expect(next.holeCards.filter((c) => c.length > 0)).toHaveLength(2)
    expect(next.button).toBe(1)
  })

  it('a newcomer with chips is dealt in', () => {
    const finished = {
      ...sixHanded({ stacks: [1000, 1000, 0, 0, 0, 0] }),
      phase: 'complete' as const,
      toAct: null,
    }
    const next = nextHand(finished, 10, BB, createDeck(), [1000, 1000, 0, 0, 1000, 0])!
    expect(next.holeCards[4]).toHaveLength(2)
  })

  it('the game is over when only one player has chips', () => {
    const finished = { ...sixHanded(), phase: 'complete' as const, toAct: null }
    expect(nextHand(finished, 10, BB, createDeck(), [6000, 0, 0, 0, 0, 0])).toBeNull()
  })
})

describe('applyAction never changes its input', () => {
  it('returns a new hand', () => {
    const hand = sixHanded()
    const copy = structuredClone(hand)
    applyAction(hand, { type: 'raise', amount: 60 }, BB)
    expect(hand).toEqual(copy)
  })
})
