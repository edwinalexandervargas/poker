import { describe, expect, it } from 'vitest'
import { countUnread } from './unread'

const msgs = [
  { seat: 1, at: 100 },
  { seat: 0, at: 200 },
  { seat: 2, at: 300 },
]

describe('countUnread', () => {
  it('counts messages from others after the last read', () => {
    expect(countUnread(msgs, 0, 150)).toBe(1)
  })
  it('never counts your own messages', () => {
    expect(countUnread(msgs, 0, 0)).toBe(2)
  })
  it('nothing new: zero', () => {
    expect(countUnread(msgs, 0, 300)).toBe(0)
  })
})
