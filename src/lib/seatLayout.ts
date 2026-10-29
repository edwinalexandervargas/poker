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
}

// Seven spots, clockwise from bottom-left to bottom-right.
const SPOTS: Spot[] = [
  { left: 12, top: 74 },
  { left: 10, top: 42 },
  { left: 25, top: 13 },
  { left: 50, top: 11 },
  { left: 75, top: 13 },
  { left: 90, top: 42 },
  { left: 88, top: 74 },
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
