import { describe, expect, it } from 'vitest'
import type { HandState } from './hand.js'
import { toPublicState } from './publicState.js'
import { packHand, packPublic, unpackHand, unpackPublic } from './storage.js'

const hand: HandState = {
  handNumber: 2,
  phase: 'flop',
  button: 1,
  toAct: 0,
  stacks: [900, 1000],
  bets: [0, 0],
  pot: 100,
  actionsThisRound: 0,
  community: ['2c', '7d', '9h'],
  holeCards: [
    ['As', 'Ad'],
    ['Kh', 'Qc'],
  ],
  deck: ['3d', '4d'],
}

/** True if any array in this value (at any depth) directly contains another array. */
function hasNestedArray(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => Array.isArray(item) || hasNestedArray(item))
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(hasNestedArray)
  }
  return false
}

describe('the engine shape cannot be stored, the packed shape can', () => {
  it('the engine hand has a nested array (that is the problem)', () => {
    expect(hasNestedArray(hand)).toBe(true)
  })

  it('a packed hand has no nested arrays', () => {
    expect(hasNestedArray(packHand(hand))).toBe(false)
  })

  it('a packed public view has no nested arrays, hidden or shown', () => {
    expect(hasNestedArray(packPublic(toPublicState(hand, false)))).toBe(false)
    expect(hasNestedArray(packPublic(toPublicState(hand, true)))).toBe(false)
  })
})

describe('packing and unpacking', () => {
  it('a hand survives the round trip unchanged', () => {
    expect(unpackHand(packHand(hand))).toEqual(hand)
  })

  it('a public view survives the round trip, shown or hidden', () => {
    for (const reveal of [false, true]) {
      const view = toPublicState(hand, reveal)
      expect(unpackPublic(packPublic(view))).toEqual(view)
    }
  })

  it('keeps each seat’s cards under its own key', () => {
    const packed = packHand(hand)
    expect(packed.holeCards.seat0).toEqual(['As', 'Ad'])
    expect(packed.holeCards.seat1).toEqual(['Kh', 'Qc'])
  })

  it('does not change what it was given', () => {
    const snapshot = JSON.parse(JSON.stringify(hand))
    packHand(hand)
    expect(hand).toEqual(snapshot)
  })
})
