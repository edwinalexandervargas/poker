import type { Card, PublicHandState, Seat } from '@shared/engine'
import type { SeatState, TableState } from '@/lib/fakeTable'
import type { SeatedPlayer } from '@/lib/useRoom'

/** The viewer's own two cards, from rooms/{code}/private/{uid}. */
export interface MyCards {
  handNumber: number
  cards: Card[]
}

interface TableFromHandInput {
  hand: PublicHandState
  players: SeatedPlayer[]
  mySeat: Seat
  myCards: MyCards | null
  bigBlind: number
}

function asPair(cards: Card[] | undefined): [Card, Card] | undefined {
  return cards && cards.length === 2 ? [cards[0]!, cards[1]!] : undefined
}

/**
 * Turns what the server publishes into what the table screen draws.
 * Pure: no Firebase, no React. This is where "who may see which cards" is decided
 * on the screen: my own cards always, the opponent's only once the server has shown them.
 */
export function tableFromHand({
  hand,
  players,
  mySeat,
  myCards,
  bigBlind,
}: TableFromHandInput): TableState {
  function seatState(seat: Seat): SeatState {
    // My cards belong to a hand. If they are from an older hand, they are not mine to show yet.
    const mine =
      myCards && myCards.handNumber === hand.handNumber ? myCards.cards : undefined
    const holeCards = seat === mySeat ? asPair(mine) : asPair(hand.shown?.[seat])

    return {
      seat,
      name: players.find((p) => p.seat === seat)?.name ?? 'Player',
      stack: hand.stacks[seat],
      bet: hand.bets[seat],
      isDealer: hand.button === seat,
      isToAct: hand.toAct === seat,
      inHand: true,
      holeCards,
    }
  }

  return {
    phase: hand.phase,
    pot: hand.pot,
    community: hand.community,
    mySeat,
    bigBlind,
    seats: [seatState(0), seatState(1)],
    result: hand.result,
  }
}
