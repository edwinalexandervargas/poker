import { headsUp, type HeadsUpFixture } from './testHand.js'
import { describe, expect, it } from 'vitest'
import type { HandState } from './hand.js'
import pokersolverForTest from 'pokersolver'
import { describeWin, getWinners, handTitle, resolveShowdown } from './showdown.js'
import type { Card } from './types.js'

// A board with nothing special on it: no pair, no straight, no flush.
const dryBoard: Card[] = ['2c', '7d', '9h', 'Js', '3d']

describe('getWinners', () => {
  it('seat 0 wins with a pair of aces against king-high', () => {
    expect(
      getWinners(
        [
          ['As', 'Ad'],
          ['Kh', 'Qc'],
        ],
        dryBoard,
      ),
    ).toEqual([0])
  })

  it('seat 1 wins when the cards are swapped', () => {
    expect(
      getWinners(
        [
          ['Kh', 'Qc'],
          ['As', 'Ad'],
        ],
        dryBoard,
      ),
    ).toEqual([1])
  })

  it('a flush beats a pair', () => {
    const board: Card[] = ['2h', '7h', '9h', 'Js', '3d']
    expect(
      getWinners(
        [
          ['Ah', 'Kh'],
          ['Jd', 'Jc'],
        ],
        board,
      ),
    ).toEqual([0])
  })

  it('when both pair the ace, the better kicker wins', () => {
    const board: Card[] = ['Ad', '7c', '8h', '2s', '3d']
    expect(
      getWinners(
        [
          ['Ac', 'Kd'],
          ['Ah', 'Qd'],
        ],
        board,
      ),
    ).toEqual([0])
  })

  it('it is a tie when the board is the best hand for both', () => {
    const board: Card[] = ['Ts', 'Js', 'Qs', 'Ks', 'As']
    expect(
      getWinners(
        [
          ['2c', '3d'],
          ['4h', '5c'],
        ],
        board,
      ),
    ).toEqual([0, 1])
  })
})

function showdownHand(overrides: Partial<HeadsUpFixture> = {}): HandState {
  return headsUp({
    handNumber: 1,
    phase: 'showdown',
    button: 0,
    toAct: null,
    stacks: [900, 900],
    bets: [0, 0],
    pot: 200,
    actionsThisRound: 0,
    community: dryBoard,
    holeCards: [
      ['As', 'Ad'],
      ['Kh', 'Qc'],
    ],
    deck: [],
    ...overrides,
  } as HeadsUpFixture)
}

describe('resolveShowdown', () => {
  it('the winner takes the whole pot', () => {
    const next = resolveShowdown(showdownHand())
    expect(next.stacks).toEqual([1100, 900])
  })

  it('works when seat 1 is the winner', () => {
    const next = resolveShowdown(
      showdownHand({
        holeCards: [
          ['Kh', 'Qc'],
          ['As', 'Ad'],
        ],
      }),
    )
    expect(next.stacks).toEqual([900, 1100])
  })

  it('ends the hand: pot empty, phase complete, nobody to act', () => {
    const next = resolveShowdown(showdownHand())
    expect(next.pot).toBe(0)
    expect(next.phase).toBe('complete')
    expect(next.toAct).toBeNull()
  })

  it('a tie splits the pot evenly', () => {
    const next = resolveShowdown(
      showdownHand({
        community: ['Ts', 'Js', 'Qs', 'Ks', 'As'],
        holeCards: [
          ['2c', '3d'],
          ['4h', '5c'],
        ],
      }),
    )
    expect(next.stacks).toEqual([1000, 1000])
  })

  it('on a tie with an odd pot, the extra chip goes to the player who is not the button', () => {
    // An odd pot needs dead money: a third player put in one 5-chip and folded.
    const tie = {
      community: ['Ts', 'Js', 'Qs', 'Ks', 'As'] as Card[],
      stacks: [900, 900, 995],
      bets: [0, 0, 0],
      holeCards: [
        ['2c', '3d'],
        ['4h', '5c'],
        ['9d', '8d'],
      ] as Card[][],
      folded: [false, false, true],
      committed: [100, 100, 5],
      pot: 205,
    }
    expect(resolveShowdown(showdownHand({ ...tie, button: 0 })).stacks).toEqual([
      1000, 1005, 995,
    ])
    expect(resolveShowdown(showdownHand({ ...tie, button: 1 })).stacks).toEqual([
      1005, 1000, 995,
    ])
  })

  it('never creates or destroys chips', () => {
    const before = showdownHand({
      community: ['Ts', 'Js', 'Qs', 'Ks', 'As'],
      holeCards: [
        ['2c', '3d'],
        ['4h', '5c'],
      ],
      pot: 333,
    })
    const next = resolveShowdown(before)
    expect(next.stacks[0]! + next.stacks[1]! + next.pot).toBe(900 + 900 + 333)
  })

  it('throws if the hand is not at showdown', () => {
    expect(() => resolveShowdown(showdownHand({ phase: 'river' }))).toThrow()
  })

  it('does not change the hand it was given', () => {
    const before = showdownHand()
    const snapshot = JSON.parse(JSON.stringify(before))
    resolveShowdown(before)
    expect(before).toEqual(snapshot)
  })
})

describe('describeWin', () => {
  const { Hand } = pokersolverForTest
  const board = ['Ah', 'Qd', 'Ks', 'Ac', '4h']
  const solve = (hole: string[]) => Hand.solve([...hole, ...board])

  it('names the kicker when it decides a pair against a pair', () => {
    expect(describeWin(solve(['2d', 'Jc']), [solve(['8s', '7h'])])).toBe(
      "Pair, A's (J kicker)",
    )
  })

  it('says 10 rather than T', () => {
    expect(describeWin(solve(['Th', '2c']), [solve(['8s', '7h'])])).toBe(
      "Pair, A's (10 kicker)",
    )
  })

  it('leaves the name alone when the hands are different kinds', () => {
    expect(describeWin(solve(['Kd', '2c']), [solve(['8s', '7h'])])).toBe(
      "Two Pair, A's & K's",
    )
  })

  it('leaves the name alone when the made hand itself is better', () => {
    const b = ['2h', '5d', '9s', 'Jc', '3h']
    const win = Hand.solve(['Ad', 'Ac', ...b])
    const lose = Hand.solve(['Kd', 'Kc', ...b])
    expect(describeWin(win, [lose])).toBe("Pair, A's")
  })

  it('leaves the name alone with nobody to compare against', () => {
    expect(describeWin(solve(['2d', 'Jc']), [])).toBe("Pair, A's")
  })
})

describe('handTitle', () => {
  it.each([
    ['Flush, Qd High', 'Flush, Q high'],
    ['Straight Flush, Kd High', 'Straight Flush, K high'],
    ['Straight, 10 High', 'Straight, 10 high'],
    ['A High', 'A high'],
    ["Pair, A's", "Pair, A's"],
    ['Royal Flush', 'Royal Flush'],
  ])('%s → %s', (descr, title) => {
    expect(handTitle(descr)).toBe(title)
  })

  it('tidies the banner for a flush win', () => {
    const { Hand } = pokersolverForTest
    const board = ['Qd', '2d', '9h', '3d', '8d']
    const win = Hand.solve(['5s', 'Jd', ...board])
    const lose = Hand.solve(['5c', '8h', ...board])
    expect(describeWin(win, [lose])).toBe('Flush, Q high')
  })
})
