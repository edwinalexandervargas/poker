import type { Card, HandResult, NutStrength, Phase, Seat } from '@shared/engine'

// What one player's seat looks like to the person viewing the table.
export interface SeatState {
  seat: Seat
  name: string
  /** Chips behind, not yet bet. */
  stack: number
  /** Chips this player has put in during the current betting round. */
  bet: number
  isDealer: boolean
  isToAct: boolean
  /** Still playing this hand (false after folding, or when not dealt in). */
  inHand: boolean
  /** Was dealt cards this hand. False for someone who sat down mid-hand or is out of chips. */
  dealtIn?: boolean
  /** This player's screen has stopped checking in. */
  away?: boolean
  /** Their latest emoji reaction. */
  reaction?: { emoji: string; at: number }
  /**
   * Only the viewing player's own hole cards are ever present. Everyone else's are
   * missing on purpose: the server never sends them, so the UI can only draw
   * face-down cards for them. (This mirrors the Firestore rule on private/{uid}.)
   */
  holeCards?: [Card, Card]
}

// Everything the table screen needs to draw one moment of the game.
export interface TableState {
  phase: Phase
  /** Which hand this is. Lets the screen tell a new hand from the same one updating. */
  handNumber?: number
  /** Chips collected from finished betting rounds. Current bets sit in front of seats. */
  pot: number
  /** 0 cards preflop, 3 on the flop, 4 on the turn, 5 on the river. */
  community: Card[]
  /** Which seat the person looking at the screen is sitting in. */
  mySeat: Seat
  /** The minimum opening bet, and the smallest raise increment. */
  bigBlind: number
  /** Every occupied seat, in seat order. Up to 8. */
  seats: SeatState[]
  /** What my cards make, and my rough chance of winning if the table shows it. */
  myHand?: { name: string; equity: number | null; nut?: NutStrength | null } | null
  /** How the hand ended. Missing (or null) while the hand is still being played. */
  result?: HandResult | null
}

// A fake hand on the flop, blinds 10/20, both players started with 1000.
//   Preflop: seat 0 (button) raised to 60, seat 1 called, so the pot is 120.
//   Flop A♠ K♦ 7♥: seat 1 bet 40 and it is seat 0's turn.
// Chips check out: 940 + 900 + 120 (pot) + 40 (bet) = 2000.
export const fakeTable: TableState = {
  phase: 'flop',
  pot: 120,
  community: ['As', 'Kd', '7h'],
  mySeat: 0,
  bigBlind: 20,
  seats: [
    {
      seat: 0,
      name: 'You',
      stack: 940,
      bet: 0,
      isDealer: true,
      isToAct: true,
      inHand: true,
      holeCards: ['Qs', 'Jd'],
    },
    {
      seat: 1,
      name: 'Alex',
      stack: 900,
      bet: 40,
      isDealer: false,
      isToAct: false,
      inHand: true,
    },
  ],
}

/** The SeatState for a seat number (the list only holds occupied seats). */
export function seatAt(table: TableState, seat: Seat): SeatState | undefined {
  return table.seats.find((s) => s.seat === seat)
}
