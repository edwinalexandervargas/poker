import { describe, expect, it } from 'vitest'
import { parseAction } from './parseAction.js'

describe('parseAction: valid moves', () => {
  it('accepts fold, check and call', () => {
    expect(parseAction({ type: 'fold' })).toEqual({ type: 'fold' })
    expect(parseAction({ type: 'check' })).toEqual({ type: 'check' })
    expect(parseAction({ type: 'call' })).toEqual({ type: 'call' })
  })

  it('accepts a raise with a whole-number amount', () => {
    expect(parseAction({ type: 'raise', amount: 60 })).toEqual({ type: 'raise', amount: 60 })
  })
})

describe('parseAction: things that are not moves', () => {
  it('rejects values that are not objects', () => {
    expect(parseAction(null)).toBeNull()
    expect(parseAction(undefined)).toBeNull()
    expect(parseAction('fold')).toBeNull()
    expect(parseAction(42)).toBeNull()
    expect(parseAction(['fold'])).toBeNull()
  })

  it('rejects an unknown or misspelled type', () => {
    expect(parseAction({})).toBeNull()
    expect(parseAction({ type: 'bet', amount: 50 })).toBeNull()
    expect(parseAction({ type: 'Fold' })).toBeNull()
    expect(parseAction({ type: 5 })).toBeNull()
  })
})

describe('parseAction: bad raises', () => {
  it('rejects a raise with no amount', () => {
    expect(parseAction({ type: 'raise' })).toBeNull()
  })

  it('rejects an amount that is not a number', () => {
    expect(parseAction({ type: 'raise', amount: '60' })).toBeNull()
    expect(parseAction({ type: 'raise', amount: null })).toBeNull()
  })

  it('rejects an amount that is not a positive whole number', () => {
    expect(parseAction({ type: 'raise', amount: 0 })).toBeNull()
    expect(parseAction({ type: 'raise', amount: -20 })).toBeNull()
    expect(parseAction({ type: 'raise', amount: 12.5 })).toBeNull()
    expect(parseAction({ type: 'raise', amount: NaN })).toBeNull()
    expect(parseAction({ type: 'raise', amount: Infinity })).toBeNull()
  })
})

describe('parseAction: extra fields', () => {
  it('throws away anything that is not part of an Action', () => {
    expect(parseAction({ type: 'fold', admin: true, stack: 1e9 })).toEqual({ type: 'fold' })
    expect(parseAction({ type: 'raise', amount: 60, sneaky: 'x' })).toEqual({
      type: 'raise',
      amount: 60,
    })
  })

  it('does not carry an amount over onto a non-raise', () => {
    expect(parseAction({ type: 'call', amount: 500 })).toEqual({ type: 'call' })
  })
})
