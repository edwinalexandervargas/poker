// Where each other player sits around the oval on screen.
// Pure: no React.
//
// You are always drawn at the bottom. Everyone else is placed clockwise from your left
// (the player after you in seat order is just to your left, as at a real table). With
// fewer players they are spread out instead of leaving gaps for the empty seats.

import type { Seat } from '@shared/engine'

/** A spot around the oval, as percentages of the table area (the seat's centre). */
export interface Spot {
  left: number
  top: number
  /** Where this seat's bet sits on the felt. */
  bet?: { left: number; top: number }
  /** The same on a phone turned sideways, where the oval has different proportions. */
  betSideways?: { left: number; top: number }
}

// Seven spots, clockwise from bottom-left to bottom-right. Each has a hand-placed spot for
// that player's bet: on the felt in front of them, clear of the board cards in the middle.
const SPOTS: Spot[] = [
  { left: 12, top: 78, bet: { left: 27, top: 76 }, betSideways: { left: 25, top: 80 } },
  { left: 10, top: 42, bet: { left: 26, top: 40 }, betSideways: { left: 24, top: 44 } },
  { left: 25, top: 13, bet: { left: 32, top: 37 }, betSideways: { left: 34, top: 34 } },
  { left: 50, top: 11, bet: { left: 50, top: 31 }, betSideways: { left: 50, top: 33 } },
  { left: 75, top: 13, bet: { left: 68, top: 37 }, betSideways: { left: 66, top: 34 } },
  { left: 90, top: 42, bet: { left: 74, top: 40 }, betSideways: { left: 76, top: 44 } },
  { left: 88, top: 78, bet: { left: 73, top: 76 }, betSideways: { left: 75, top: 80 } },
]

// Which of the seven spots to use for each number of other players.
const SPOTS_FOR: Record<number, number[]> = {
  1: [3],
  2: [2, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [0, 1, 2, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
}

/**
 * Assigns a spot to every seat except mine. `seats` are the occupied seats (mine included),
 * `seatCount` the table size used to work out "clockwise from me".
 */
export function layoutSeats(
  seats: readonly Seat[],
  mySeat: Seat,
  seatCount: number,
): Map<Seat, Spot> {
  const others = seats
    .filter((s) => s !== mySeat)
    .sort(
      (a, b) =>
        ((a - mySeat + seatCount) % seatCount) - ((b - mySeat + seatCount) % seatCount),
    )
  const chosen = SPOTS_FOR[others.length] ?? []
  return new Map(others.map((seat, i) => [seat, SPOTS[chosen[i]!]!]))
}

/** Where my own seat is, for working out where my bet goes (just below the oval). */
export const MY_SPOT: Spot = {
  left: 50,
  top: 96,
  bet: { left: 50, top: 78 },
  betSideways: { left: 50, top: 81 },
}

/** The middle of the felt, where the pot sits. */
export const POT_SPOT: Spot = { left: 50, top: 46 }

/**
 * Where a seat's bet sits: its hand-placed spot (a separate one on a phone turned sideways),
 * or otherwise part of the way from the seat towards the pot, like chips pushed forward on a
 * real table.
 */
export function betSpot(seat: Spot, share = 0.42, sideways = false): Spot {
  if (sideways && seat.betSideways) return seat.betSideways
  if (seat.bet) return seat.bet
  return {
    left: seat.left + (POT_SPOT.left - seat.left) * share,
    top: seat.top + (POT_SPOT.top - seat.top) * share,
  }
}
