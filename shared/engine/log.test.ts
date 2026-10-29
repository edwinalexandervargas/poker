import { describe, expect, it } from 'vitest'
import { applyAction } from './apply.js'
import { createDeck } from './deck.js'
import { startHand, type HandState } from './hand.js'
import {
  cardText,
  describeBoard,
  describeEnd,
  describeMove,
  describeStart,
} from './log.js'
import type { Action } from './types.js'

const names = ['Alice', 'Bob', 'Cara']
const name = (seat: number) => names[seat]!
const BB = 20

function threeHanded(stacks = [1000, 1000, 1000]): HandState {
  return startHand({
    handNumber: 7,
    button: 0,
    stacks,
    smallBlind: 10,
    bigBlind: BB,
    deck: createDeck(),
  })
}

function move(hand: HandState, action: Action) {
  const after = applyAction(hand, action, BB)
  return { after, lines: describeMove(hand, action, after, BB, name) }
}

describe('cardText', () => {
  it('uses suit symbols and writes ten as 10', () => {
    expect(cardText('As')).toBe('A♠')
    expect(cardText('Td')).toBe('10♦')
    expect(cardText('2h')).toBe('2♥')
  })
})

describe('describeStart', () => {
  it('says who has the button and who posted the blinds, small blind first', () => {
    expect(describeStart(threeHanded(), name)).toEqual([
      'Hand 7: Alice has the button',
      'Bob posts 10',
      'Cara posts 20',
    ])
  })
})

describe('describeMove', () => {
  it('fold, call and raise', () => {
    const hand = threeHanded() // Alice (button) acts first, three-handed
    expect(move(hand, { type: 'fold' }).lines).toEqual(['Alice folds'])
    expect(move(hand, { type: 'call' }).lines).toEqual(['Alice calls 20'])
    expect(move(hand, { type: 'raise', amount: 60 }).lines).toEqual([
      'Alice raises to 60',
    ])
  })

  it('says "bets" when nobody has bet yet on this street', () => {
    let hand = threeHanded()
    hand = applyAction(hand, { type: 'call' }, BB) // Alice
    hand = applyAction(hand, { type: 'call' }, BB) // Bob
    hand = applyAction(hand, { type: 'check' }, BB) // Cara: flop comes
    expect(move(hand, { type: 'check' }).lines).toEqual(['Bob checks'])
    expect(move(hand, { type: 'raise', amount: 40 }).lines).toEqual(['Bob bets 40'])
  })

  it('points out an all-in', () => {
    const hand = threeHanded([300, 1000, 1000])
    expect(move(hand, { type: 'raise', amount: 300 }).lines).toEqual([
      'Alice raises to 300 and is all-in',
    ])
  })

  it('adds the flop when the move ends the betting round', () => {
    let hand = threeHanded()
    hand = applyAction(hand, { type: 'call' }, BB)
    hand = applyAction(hand, { type: 'call' }, BB)
    const { after, lines } = move(hand, { type: 'check' })
    expect(lines[0]).toBe('Cara checks')
    expect(lines[1]).toBe(`Flop: ${after.community.map(cardText).join(' ')}`)
  })
})

describe('describeBoard', () => {
  it('an all-in run-out lists the flop, turn and river', () => {
    expect(describeBoard([], ['As', 'Kd', '7h', '2c', '9s'])).toEqual([
      'Flop: A♠ K♦ 7♥',
      'Turn: 2♣',
      'River: 9♠',
    ])
  })
  it('nothing new, nothing said', () => {
    expect(describeBoard(['As', 'Kd', '7h'], ['As', 'Kd', '7h'])).toEqual([])
  })
})

describe('describeEnd', () => {
  it('a hand won by folds', () => {
    let hand = threeHanded()
    hand = applyAction(hand, { type: 'fold' }, BB)
    hand = applyAction(hand, { type: 'fold' }, BB)
    expect(describeEnd(hand, name)).toEqual(['Cara wins 30 (everyone else folded)'])
  })

  it('a showdown: cards shown, then the winner', () => {
    const done = {
      ...threeHanded(),
      phase: 'complete' as const,
      toAct: null,
      folded: [false, true, false],
      holeCards: [
        ['As', 'Ad'],
        ['2c', '3c'],
        ['Kh', 'Qh'],
      ] as HandState['holeCards'],
      result: {
        reason: 'showdown' as const,
        winners: [0],
        payouts: [200, 0, 0],
        handName: "Pair, A's",
        pots: [{ amount: 200, winners: [0] }],
      },
    }
    expect(describeEnd(done, name)).toEqual([
      'Alice shows A♠ A♦',
      'Cara shows K♥ Q♥',
      "Alice wins (200) with Pair, A's",
    ])
  })

  it('side pots and splits', () => {
    const done = {
      ...threeHanded(),
      phase: 'complete' as const,
      toAct: null,
      result: {
        reason: 'showdown' as const,
        winners: [0, 1, 2],
        payouts: [150, 550, 400],
        handName: 'Straight',
        pots: [
          { amount: 300, winners: [0, 1] },
          { amount: 800, winners: [1, 2] },
        ],
      },
    }
    expect(describeEnd(done, name).slice(-2)).toEqual([
      'Alice and Bob split the main pot (300) with Straight',
      'Bob and Cara split a side pot (800)',
    ])
  })
})
