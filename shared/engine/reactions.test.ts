import { describe, expect, it } from 'vitest'
import { REACTION_COOLDOWN_MS, canReactAgain, isReaction } from './reactions.js'

describe('isReaction', () => {
  it('accepts the allowed emojis', () => {
    expect(isReaction('👍')).toBe(true)
    expect(isReaction('🔥')).toBe(true)
  })
  it('refuses anything else a browser might send', () => {
    expect(isReaction('hello')).toBe(false)
    expect(isReaction('💩')).toBe(false)
    expect(isReaction(42)).toBe(false)
    expect(isReaction(undefined)).toBe(false)
  })
})

describe('canReactAgain', () => {
  it('the first reaction is always allowed', () => {
    expect(canReactAgain(undefined, 1000)).toBe(true)
  })
  it('not again until the cooldown has passed', () => {
    expect(canReactAgain(1000, 1000 + REACTION_COOLDOWN_MS - 1)).toBe(false)
    expect(canReactAgain(1000, 1000 + REACTION_COOLDOWN_MS)).toBe(true)
  })
})
