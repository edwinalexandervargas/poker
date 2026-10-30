import type { Card, NutStrength, PublicHandState, Seat } from '@shared/engine'
import type { SeatState, TableState } from '@/lib/fakeTable'
import type { SeatedPlayer } from '@/lib/useRoom'

/** The viewer's own two cards, from rooms/{code}/private/{uid}. */
export interface MyCards {
  handNumber: number
  cards: Card[]
  /** What my cards make, like "Pair of Aces" (worked out by the server). */
  handName?: string | null
  /** My rough chance of winning, 0 to 1, when the table shows hand strength. */
  /** How close my hand is to the nuts right now (from the flop on, if the table shows it). */
  nut?: NutStrength | null
}

interface TableFromHandInput {
  hand: PublicHandState
  players: SeatedPlayer[]
  mySeat: Seat
  myCards: MyCards | null
  bigBlind: number
  /** Seats whose screens have stopped checking in. */
  awaySeats?: ReadonlySet<Seat>
}

function asPair(cards: Card[] | undefined): [Card, Card] | undefined {
  return cards && cards.length === 2 ? [cards[0]!, cards[1]!] : undefined
}

/**
 * Turns what the server publishes into what the table screen draws.
 * Pure: no Firebase, no React. This is where "who may see which cards" is decided
 * on the screen: my own cards always, anyone else's only once the server has shown them.
 */
export function tableFromHand({
  hand,
  players,
  mySeat,
  myCards,
  bigBlind,
  awaySeats,
}: TableFromHandInput): TableState {
  function seatState(player: SeatedPlayer): SeatState {
    const seat = player.seat
    // Hands stored before multi-player support have no dealtIn list: everyone was dealt in.
    const dealtIn = hand.dealtIn?.[seat] ?? true
    const folded = hand.folded?.[seat] ?? false
    // My cards belong to a hand. If they are from an older hand, they are not mine to show yet.
    const mine =
      myCards && myCards.handNumber === hand.handNumber ? myCards.cards : undefined

    return {
      seat,
      name: player.name,
      // Someone who sat down mid-hand isn't in the hand's numbers yet: show their own chips.
      stack: dealtIn ? (hand.stacks[seat] ?? 0) : player.stack,
      bet: hand.bets[seat] ?? 0,
      isDealer: hand.button === seat,
      isToAct: hand.toAct === seat,
      inHand: dealtIn && !folded,
      dealtIn,
      away: awaySeats?.has(seat) ?? false,
      holeCards: seat === mySeat ? asPair(mine) : asPair(hand.shown?.[seat]),
    }
  }

  return {
    phase: hand.phase,
    handNumber: hand.handNumber,
    pot: hand.pot,
    community: hand.community,
    mySeat,
    bigBlind,
    seats: players.toSorted((a, b) => a.seat - b.seat).map(seatState),
    result: hand.result,
    // What I have, only for the current hand (an older document is from the last hand).
    myHand:
      myCards && myCards.handNumber === hand.handNumber && myCards.handName
        ? {
            name: myCards.handName,
            nut: myCards.nut ?? null,
          }
        : null,
  }
}
