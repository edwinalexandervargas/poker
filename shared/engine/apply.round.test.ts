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

describe('applyAction: counting moves', () => {
  it('check, call and raise each mark the player as having acted', () => {
    expect(applyAction(hand(), { type: 'call' }, BIG_BLIND).acted).toEqual([true, false])
    expect(applyAction(hand(), { type: 'raise', amount: 60 }, BIG_BLIND).acted).toEqual([
      true,
      false,
    ])
    const checkSpot = hand({ phase: 'flop', toAct: 1, bets: [0, 0], stacks: [900, 900] })
    expect(applyAction(checkSpot, { type: 'check' }, BIG_BLIND).acted).toEqual([
      false,
      true,
    ])
  })

  it('a raise means everyone else has to act again', () => {
    const afterCall = applyAction(hand(), { type: 'call' }, BIG_BLIND)
    const raised = applyAction(afterCall, { type: 'raise', amount: 60 }, BIG_BLIND)
    expect(raised.acted).toEqual([false, true])
  })
})

describe('applyAction: the round keeps going', () => {
  it('the small blind calls preflop: the big blind still gets their option', () => {
    const next = applyAction(hand(), { type: 'call' }, BIG_BLIND)
    expect(next.phase).toBe('preflop')
    expect(next.toAct).toBe(1)
    expect(next.bets).toEqual([20, 20])
    expect(next.pot).toBe(0)
  })

  it('a raise does not end the round', () => {
    const next = applyAction(hand(), { type: 'raise', amount: 60 }, BIG_BLIND)
    expect(next.phase).toBe('preflop')
    expect(next.toAct).toBe(1)
  })

  it('the first check on a street does not end it', () => {
    const next = applyAction(
      hand({ phase: 'flop', toAct: 1, bets: [0, 0], stacks: [900, 900], pot: 200 }),
      { type: 'check' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('flop')
    expect(next.toAct).toBe(0)
  })
})

describe('applyAction: the round ends', () => {
  it('the big blind checks their option: the flop is dealt', () => {
    const next = applyAction(
      hand({ toAct: 1, bets: [20, 20], stacks: [980, 980], actionsThisRound: 1 }),
      { type: 'check' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('flop')
    expect(next.pot).toBe(40)
    expect(next.bets).toEqual([0, 0])
    expect(next.community).toEqual(deck.slice(0, 3))
    expect(next.toAct).toBe(1)
    expect(next.acted).toEqual([false, false])
  })

  it('a raise that gets called ends the round', () => {
    const next = applyAction(
      hand({ toAct: 1, bets: [60, 20], stacks: [940, 980], actionsThisRound: 1 }),
      { type: 'call' },
      BIG_BLIND,
    )
    expect(next.phase).toBe('flop')
    expect(next.pot).toBe(120)
    expect(next.stacks).toEqual([940, 940])
  })

  it('check, check on the river goes to showdown', () => {
    const river = hand({
      phase: 'river',
      toAct: 0,
      bets: [0, 0],
      stacks: [900, 900],
      pot: 200,
      actionsThisRound: 1,
      community: deck.slice(0, 5),
      deck: deck.slice(5),
    })
    const next = applyAction(river, { type: 'check' }, BIG_BLIND)
    expect(next.phase).toBe('showdown')
    expect(next.toAct).toBeNull()
    expect(next.pot).toBe(200)
  })

  it('a fold still ends the hand straight away', () => {
    const next = applyAction(hand(), { type: 'fold' }, BIG_BLIND)
    expect(next.phase).toBe('complete')
  })
})
