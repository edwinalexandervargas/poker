import { describe, expect, it } from 'vitest'
import type { HandState } from './hand.js'
import { toPublicState } from './publicState.js'

function hand(overrides: Partial<HandState> = {}): HandState {
  return {
    handNumber: 4,
    phase: 'turn',
    button: 1,
    toAct: 0,
    stacks: [800, 700],
    bets: [50, 0],
    pot: 450,
    actionsThisRound: 1,
    community: ['2c', '7d', '9h', 'Js'],
    holeCards: [['As', 'Ad'], ['Kh', 'Qc']],
    deck: ['3d', '4d', '5d', '6d'],
    ...overrides,
  }
}

describe('toPublicState: what everyone may see', () => {
  it('copies the public fields', () => {
    const view = toPublicState(hand(), false)
    expect(view.handNumber).toBe(4)
    expect(view.phase).toBe('turn')
    expect(view.button).toBe(1)
    expect(view.toAct).toBe(0)
    expect(view.stacks).toEqual([800, 700])
    expect(view.bets).toEqual([50, 0])
    expect(view.pot).toBe(450)
    expect(view.community).toEqual(['2c', '7d', '9h', 'Js'])
  })
})

describe('toPublicState: keeping secrets', () => {
  it('has no deck and no holeCards fields', () => {
    const view = toPublicState(hand(), false) as unknown as Record<string, unknown>
    expect(view).not.toHaveProperty('deck')
    expect(view).not.toHaveProperty('holeCards')
  })

  it('does not contain any hole card or deck card anywhere in it', () => {
    const text = JSON.stringify(toPublicState(hand(), false))
    for (const secret of ['As', 'Ad', 'Kh', 'Qc', '3d', '4d', '5d', '6d']) {
      expect(text).not.toContain(`"${secret}"`)
    }
  })

  it('hides the hole cards when nobody should see them (shown is null)', () => {
    expect(toPublicState(hand(), false).shown).toBeNull()
  })

  it('does not leak other fields of the full state', () => {
    const view = toPublicState(hand(), false) as unknown as Record<string, unknown>
    expect(view).not.toHaveProperty('actionsThisRound')
  })
})

describe('toPublicState: showdown', () => {
  it('shows both players hole cards when reveal is true', () => {
    const view = toPublicState(hand({ phase: 'showdown' }), true)
    expect(view.shown).toEqual([['As', 'Ad'], ['Kh', 'Qc']])
  })

  it('still never includes the deck, even when revealing', () => {
    const view = toPublicState(hand({ phase: 'showdown' }), true) as unknown as Record<string, unknown>
    expect(view).not.toHaveProperty('deck')
    expect(JSON.stringify(view)).not.toContain('"3d"')
  })
})

describe('toPublicState: purity', () => {
  it('does not change the hand it was given', () => {
    const before = hand()
    const snapshot = JSON.parse(JSON.stringify(before))
    toPublicState(before, true)
    expect(before).toEqual(snapshot)
  })
})
