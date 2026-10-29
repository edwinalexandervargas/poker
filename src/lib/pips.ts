// Where the suit symbols ("pips") go on a number card, like a real printed deck.
// Pure: no React.
//
// Positions are percentages of the card's width and height. Pips in the bottom half are
// printed upside down on a real card, so the card reads the same either way up.

export interface Pip {
  x: number
  y: number
  /** Printed upside down. */
  flip: boolean
}

const L = 35 // left column (clear of the corner index)
const C = 50 // centre column
const R = 65 // right column

const pip = (x: number, y: number): Pip => ({ x, y, flip: y > 50 })

// The classic layouts. Rows: 21 top, 79 bottom, 50 middle, with 35/65 and 40/60 between.
const LAYOUTS: Record<string, Pip[]> = {
  '2': [pip(C, 21), pip(C, 79)],
  '3': [pip(C, 21), pip(C, 50), pip(C, 79)],
  '4': [pip(L, 21), pip(R, 21), pip(L, 79), pip(R, 79)],
  '5': [pip(L, 21), pip(R, 21), pip(C, 50), pip(L, 79), pip(R, 79)],
  '6': [pip(L, 21), pip(R, 21), pip(L, 50), pip(R, 50), pip(L, 79), pip(R, 79)],
  '7': [
    pip(L, 21),
    pip(R, 21),
    pip(C, 35),
    pip(L, 50),
    pip(R, 50),
    pip(L, 79),
    pip(R, 79),
  ],
  '8': [
    pip(L, 21),
    pip(R, 21),
    pip(C, 35),
    pip(L, 50),
    pip(R, 50),
    pip(C, 65),
    pip(L, 79),
    pip(R, 79),
  ],
  '9': [
    pip(L, 21),
    pip(R, 21),
    pip(L, 40),
    pip(R, 40),
    pip(C, 50),
    pip(L, 60),
    pip(R, 60),
    pip(L, 79),
    pip(R, 79),
  ],
  T: [
    pip(L, 21),
    pip(R, 21),
    pip(C, 30),
    pip(L, 40),
    pip(R, 40),
    pip(L, 60),
    pip(R, 60),
    pip(C, 70),
    pip(L, 79),
    pip(R, 79),
  ],
}

/** The pips for a rank ('2'..'9', 'T'), or an empty list for A, J, Q, K (drawn differently). */
export function pipsFor(rank: string): Pip[] {
  return LAYOUTS[rank] ?? []
}
