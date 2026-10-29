import { headsUp, type HeadsUpFixture } from './testHand.js'
import { describe, expect, it } from 'vitest'
import { applyAction } from './apply.js'
import { createDeck } from './deck.js'
import type { HandState } from './hand.js'

const BIG_BLIND = 20
const deck = createDeck().slice(4)

function hand(overrides: Partial<HeadsUpFixture> = {}): HandState {
  return headsUp({
    handNumber: 1,
    phase: 'preflop',
    button: 0,
    toAct: 0,
    stacks: [990, 980],
    bets: [10, 20],
    pot: 0,
    actionsThisRound: 0,
    community: [],
    holeCards: [[], []],
    deck,
    ...overrides,
  } as HeadsUpFixture)
}

describe('all-in runout: nobody can bet, so the board deals itself', () => {
  it('a call that puts a player all-in on the flop runs out the turn and river', () => {
    const next = applyAction(
      hand({
        phase: 'flop',
        toAct: 1,
        bets: [100, 0],
        stacks: [0, 400],
        pot: 200,
        actionsThisRound: 1,
        community: deck.slice(0, 3),
        deck: deck.slice(3),
      }),
      { type: 'call' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('showdown')
    expect(next.community).toEqual(deck.slice(0, 5))
    expect(next.deck).toEqual(deck.slice(5))
    expect(next.pot).toBe(400)
    expect(next.stacks).toEqual([0, 300])
    expect(next.bets).toEqual([0, 0])
    expect(next.toAct).toBeNull()
  })

  it('both players all-in preflop deals the whole board', () => {
    const afterShove = applyAction(hand(), { type: 'raise', amount: 1000 }, BIG_BLIND)
    expect(afterShove.phase).toBe('preflop')
    const next = applyAction(afterShove, { type: 'call' }, BIG_BLIND)
    expect(next.phase).toBe('showdown')
    expect(next.community).toEqual(deck.slice(0, 5))
    expect(next.pot).toBe(2000)
    expect(next.stacks).toEqual([0, 0])
  })

  it('a call for less still runs out the board, and the unmatched chips come back', () => {
    const next = applyAction(
      hand({
        phase: 'flop',
        toAct: 0,
        bets: [0, 300],
        stacks: [100, 200],
        pot: 0,
        actionsThisRound: 1,
        community: deck.slice(0, 3),
        deck: deck.slice(3),
      }),
      { type: 'call' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('showdown')
    expect(next.pot).toBe(200)
    expect(next.stacks).toEqual([0, 400])
  })

  it('never creates or destroys chips', () => {
    const before = hand({
      phase: 'flop',
      toAct: 0,
      bets: [0, 300],
      stacks: [100, 200],
      pot: 50,
      actionsThisRound: 1,
      community: deck.slice(0, 3),
      deck: deck.slice(3),
    })
    const next = applyAction(before, { type: 'call' }, BIG_BLIND)
    const total = (h: HandState) =>
      h.stacks[0]! + h.stacks[1]! + h.bets[0]! + h.bets[1]! + h.pot
    expect(total(next)).toBe(total(before))
  })
})

describe('no runout while both players still have chips', () => {
  it('check, check on the flop moves to the turn and waits for betting', () => {
    const next = applyAction(
      hand({
        phase: 'flop',
        toAct: 0,
        bets: [0, 0],
        stacks: [900, 900],
        pot: 200,
        actionsThisRound: 1,
        community: deck.slice(0, 3),
        deck: deck.slice(3),
      }),
      { type: 'check' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('turn')
    expect(next.community).toHaveLength(4)
    expect(next.toAct).toBe(1)
  })
})
