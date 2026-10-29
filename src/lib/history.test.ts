import { describe, expect, it } from 'vitest'
import { groupByHand } from './history'

const line = (handNumber: number, text: string, i = 0) => ({
  id: `${handNumber}-${text}`,
  seq: i,
  handNumber,
  text,
})

describe('groupByHand', () => {
  const log = [
    line(1, 'Hand 1: Alice has the button'),
    line(1, 'Bob posts 10'),
    line(1, 'Alice wins 30 (everyone else folded)'),
    line(0, 'Dan sits down'),
    line(2, 'Hand 2: Bob has the button'),
    line(2, 'Alice raises to 60'),
  ]

  it('newest hand first, each with its lines in order', () => {
    const hands = groupByHand(log)
    expect(hands.map((h) => h.handNumber)).toEqual([2, 1])
    expect(hands[1]!.lines).toEqual([
      'Hand 1: Alice has the button',
      'Bob posts 10',
      'Alice wins 30 (everyone else folded)',
      'Dan sits down',
    ])
  })

  it('picks out who won as the summary; an unfinished hand has none', () => {
    const hands = groupByHand(log)
    expect(hands[1]!.summary).toBe('Alice wins 30 (everyone else folded)')
    expect(hands[0]!.summary).toBeNull()
  })

  it('a split pot counts as the summary too', () => {
    const hands = groupByHand([
      line(3, 'Hand 3'),
      line(3, 'Alice and Bob split (200) with Straight'),
    ])
    expect(hands[0]!.summary).toContain('split')
  })

  it('lines before the first hand are dropped', () => {
    expect(groupByHand([line(0, 'Dan sits down')])).toEqual([])
  })
})
