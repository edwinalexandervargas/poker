import { describe, expect, it } from 'vitest'
import { hasUpdate } from './updates'

describe('hasUpdate', () => {
  it('a different build on the server is an update', () => {
    expect(hasUpdate('lx3k9a', 'lx4z2b')).toBe(true)
  })
  it('the same build is not', () => {
    expect(hasUpdate('lx3k9a', 'lx3k9a')).toBe(false)
  })
  it('could not read the version (offline): not an update', () => {
    expect(hasUpdate('lx3k9a', null)).toBe(false)
  })
  it('never in development', () => {
    expect(hasUpdate('dev', 'lx4z2b')).toBe(false)
  })
})
