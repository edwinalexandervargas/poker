import { describe, expect, it } from 'vitest'
import {
  MAX_PLAYER_NAME_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  cleanPlayerName,
  generateRoomCode,
  normalizeRoomCode,
  pickFreeSeat,
} from './room.js'

/** A "random" source that returns a fixed list of numbers, then repeats. */
function fixed(values: number[]) {
  let i = 0
  return () => values[i++ % values.length]!
}

describe('generateRoomCode', () => {
  it('has the right length and only uses allowed characters', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateRoomCode()
      expect(code).toHaveLength(ROOM_CODE_LENGTH)
      for (const char of code) expect(ROOM_CODE_ALPHABET).toContain(char)
    }
  })

  it('uses the random source to pick characters', () => {
    expect(generateRoomCode(fixed([0]))).toBe('AAAAA')
    expect(generateRoomCode(fixed([0, 1, 2, 3, 4]))).toBe('ABCDE')
  })

  it('never uses look-alike characters', () => {
    for (const bad of ['0', 'O', '1', 'I', 'L']) {
      expect(ROOM_CODE_ALPHABET).not.toContain(bad)
    }
  })
})

describe('normalizeRoomCode', () => {
  it('uppercases and strips spaces and dashes', () => {
    expect(normalizeRoomCode('k7mq2')).toBe('K7MQ2')
    expect(normalizeRoomCode(' k7 mq-2 ')).toBe('K7MQ2')
  })

  it('rejects wrong length, look-alike characters and non-strings', () => {
    expect(normalizeRoomCode('K7MQ')).toBeNull()
    expect(normalizeRoomCode('K7MQ22')).toBeNull()
    expect(normalizeRoomCode('K7MQ0')).toBeNull() // zero is not allowed
    expect(normalizeRoomCode(12345)).toBeNull()
    expect(normalizeRoomCode(undefined)).toBeNull()
  })
})

describe('cleanPlayerName', () => {
  it('trims and collapses spaces', () => {
    expect(cleanPlayerName('  Edwin   V ')).toBe('Edwin V')
  })

  it('rejects empty, too long and non-string names', () => {
    expect(cleanPlayerName('   ')).toBeNull()
    expect(cleanPlayerName('x'.repeat(MAX_PLAYER_NAME_LENGTH + 1))).toBeNull()
    expect(cleanPlayerName('x'.repeat(MAX_PLAYER_NAME_LENGTH))).not.toBeNull()
    expect(cleanPlayerName(null)).toBeNull()
  })
})

describe('pickFreeSeat', () => {
  it('picks the lowest free seat', () => {
    expect(pickFreeSeat([])).toBe(0)
    expect(pickFreeSeat([0])).toBe(1)
    expect(pickFreeSeat([1])).toBe(0)
  })

  it('fills up to 8 seats', () => {
    expect(pickFreeSeat([0, 1, 2, 3, 4, 5, 6])).toBe(7)
  })

  it('returns null when all 8 seats are taken', () => {
    expect(pickFreeSeat([0, 1, 2, 3, 4, 5, 6, 7])).toBeNull()
  })
})
