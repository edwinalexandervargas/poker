import { describe, expect, it } from 'vitest'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'
import { playTurn } from './playTurn.js'
import type { Card } from './types.js'

const BIG_BLIND = 20
const deck = createDeck().slice(4)
const board: Card[] = ['2c', '7d', '9h', 'Js', '3d']

// Seat 0 holds pocket aces, seat 1 holds king-queen. Seat 0 wins any showdown on this board.
function hand(overrides: Partial<HandState> = {}): HandState {
  return {
    handNumber: 1,
    phase: 'preflop',
    button: 0,
    toAct: 0,
    stacks: [990, 980],
    bets: [10, 20],
    pot: 0,
    actionsThisRound: 0,
    community: [],
    holeCards: [['As', 'Ad'], ['Kh', 'Qc']],
    deck,
    ...overrides,
  }
}

describe('playTurn: whose turn it is', () => {
  it('throws when the wrong seat tries to act', () => {
    expect(() => playTurn(hand({ toAct: 0 }), 1, { type: 'call' }, BIG_BLIND)).toThrow()
  })

  it('throws when the hand is finished (nobody to act)', () => {
    expect(() =>
      playTurn(hand({ phase: 'complete', toAct: null }), 0, { type: 'call' }, BIG_BLIND),
    ).toThrow()
  })
})

describe('playTurn: ordinary moves', () => {
  it('applies the move and keeps the cards hidden', () => {
    const result = playTurn(hand(), 0, { type: 'call' }, BIG_BLIND)
    expect(result.state.bets).toEqual([20, 20])
    expect(result.state.toAct).toBe(1)
    expect(result.state.phase).toBe('preflop')
    expect(result.reveal).toBe(false)
  })

  it('throws when the move is illegal', () => {
    expect(() => playTurn(hand(), 0, { type: 'check' }, BIG_BLIND)).toThrow()
  })
})

describe('playTurn: a fold', () => {
  it('ends the hand, pays the winner, and does not reveal the cards', () => {
    const result = playTurn(hand(), 0, { type: 'fold' }, BIG_BLIND)
    expect(result.state.phase).toBe('complete')
    expect(result.state.stacks).toEqual([990, 1010])
    expect(result.reveal).toBe(false)
  })
})

describe('playTurn: reaching showdown', () => {
  const river = hand({
    phase: 'river',
    toAct: 0,
    bets: [0, 0],
    stacks: [900, 900],
    pot: 200,
    actionsThisRound: 1,
    community: board,
    deck: deck.slice(5),
  })

  it('check, check on the river settles the hand and reveals the cards', () => {
    const result = playTurn(river, 0, { type: 'check' }, BIG_BLIND)
    expect(result.state.phase).toBe('complete')
    expect(result.state.stacks).toEqual([1100, 900])
    expect(result.state.pot).toBe(0)
    expect(result.state.toAct).toBeNull()
    expect(result.reveal).toBe(true)
  })

  it('a call that puts a player all-in runs the board out and settles in one go', () => {
    const before = hand({
      phase: 'flop',
      toAct: 1,
      bets: [100, 0],
      stacks: [0, 400],
      pot: 200,
      actionsThisRound: 1,
      community: deck.slice(0, 3),
      deck: deck.slice(3),
    })
    const result = playTurn(before, 1, { type: 'call' }, BIG_BLIND)
    expect(result.state.phase).toBe('complete')
    expect(result.reveal).toBe(true)
    const { stacks, bets, pot } = result.state
    expect(stacks[0] + stacks[1] + bets[0] + bets[1] + pot).toBe(700)
    expect(pot).toBe(0)
  })
})

describe('playTurn: purity', () => {
  it('does not change the hand it was given', () => {
    const before = hand()
    const snapshot = JSON.parse(JSON.stringify(before))
    playTurn(before, 0, { type: 'raise', amount: 60 }, BIG_BLIND)
    expect(before).toEqual(snapshot)
  })
})
