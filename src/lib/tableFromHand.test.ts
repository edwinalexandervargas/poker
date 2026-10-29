import { describe, expect, it } from 'vitest'
import type { PublicHandState } from '@shared/engine'
import { tableFromHand, type MyCards } from './tableFromHand'
import type { SeatedPlayer } from './useRoom'

const players: SeatedPlayer[] = [
  { uid: 'a', name: 'Alice', seat: 0, stack: 1000, connected: true },
  { uid: 'b', name: 'Bob', seat: 1, stack: 1000, connected: true },
]

const hand: PublicHandState = {
  handNumber: 3,
  phase: 'flop',
  button: 1,
  toAct: 0,
  stacks: [900, 800],
  bets: [0, 40],
  pot: 260,
  community: ['As', 'Kd', '7h'],
  shown: null,
  result: null,
}

const myCards: MyCards = { handNumber: 3, cards: ['Qs', 'Jd'] }

function build(overrides: Partial<Parameters<typeof tableFromHand>[0]> = {}) {
  return tableFromHand({ hand, players, mySeat: 0, myCards, bigBlind: 20, ...overrides })
}

describe('tableFromHand: the public numbers', () => {
  it('copies the table-wide values', () => {
    const table = build()
    expect(table.phase).toBe('flop')
    expect(table.pot).toBe(260)
    expect(table.community).toEqual(['As', 'Kd', '7h'])
    expect(table.bigBlind).toBe(20)
    expect(table.mySeat).toBe(0)
  })

  it('fills in each seat from the right player and the right numbers', () => {
    const [s0, s1] = build().seats
    expect(s0).toMatchObject({
      seat: 0,
      name: 'Alice',
      stack: 900,
      bet: 0,
      isDealer: false,
      isToAct: true,
    })
    expect(s1).toMatchObject({
      seat: 1,
      name: 'Bob',
      stack: 800,
      bet: 40,
      isDealer: true,
      isToAct: false,
    })
  })

  it('works from the other player’s point of view', () => {
    const table = build({ mySeat: 1, myCards: { handNumber: 3, cards: ['2c', '3c'] } })
    expect(table.mySeat).toBe(1)
    expect(table.seats[1].holeCards).toEqual(['2c', '3c'])
    expect(table.seats[0].holeCards).toBeUndefined()
  })
})

describe('tableFromHand: who sees which cards', () => {
  it('shows my cards and hides the opponent’s', () => {
    const [mine, theirs] = build().seats
    expect(mine.holeCards).toEqual(['Qs', 'Jd'])
    expect(theirs.holeCards).toBeUndefined()
  })

  it('shows the opponent’s cards once the server has revealed them', () => {
    const table = build({
      hand: {
        ...hand,
        phase: 'complete',
        toAct: null,
        shown: [
          ['Qs', 'Jd'],
          ['9c', '9d'],
        ],
      },
    })
    expect(table.seats[1].holeCards).toEqual(['9c', '9d'])
  })

  it('does not show cards that belong to an earlier hand', () => {
    const table = build({ myCards: { handNumber: 2, cards: ['Qs', 'Jd'] } })
    expect(table.seats[0].holeCards).toBeUndefined()
  })

  it('handles my cards not having arrived yet', () => {
    expect(build({ myCards: null }).seats[0].holeCards).toBeUndefined()
  })
})
