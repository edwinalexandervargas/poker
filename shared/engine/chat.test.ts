import { describe, expect, it } from 'vitest'
import { CHAT_COOLDOWN_MS, MAX_CHAT_LENGTH, canChatAgain, cleanChatText } from './chat.js'

describe('cleanChatText', () => {
  it('keeps a normal message', () => {
    expect(cleanChatText('nice hand!')).toBe('nice hand!')
  })
  it('trims and collapses spaces and line breaks', () => {
    expect(cleanChatText('  gg \n\n  wp   ')).toBe('gg wp')
  })
  it('removes invisible control characters', () => {
    expect(cleanChatText('hi\u0000​there')).toBe('hi there')
  })
  it('keeps emoji and accents', () => {
    expect(cleanChatText('olé 🔥')).toBe('olé 🔥')
  })
  it('refuses empty or blank messages', () => {
    expect(cleanChatText('')).toBeNull()
    expect(cleanChatText('   \n ')).toBeNull()
  })
  it('refuses messages over the limit', () => {
    expect(cleanChatText('a'.repeat(MAX_CHAT_LENGTH))).toHaveLength(MAX_CHAT_LENGTH)
    expect(cleanChatText('a'.repeat(MAX_CHAT_LENGTH + 1))).toBeNull()
  })
  it('refuses anything that is not text', () => {
    expect(cleanChatText(42)).toBeNull()
    expect(cleanChatText({ text: 'hi' })).toBeNull()
    expect(cleanChatText(undefined)).toBeNull()
  })
})

describe('canChatAgain', () => {
  it('the first message is always allowed', () => {
    expect(canChatAgain(undefined, 5000)).toBe(true)
  })
  it('not again until the cooldown has passed', () => {
    expect(canChatAgain(5000, 5000 + CHAT_COOLDOWN_MS - 1)).toBe(false)
    expect(canChatAgain(5000, 5000 + CHAT_COOLDOWN_MS)).toBe(true)
  })
})
