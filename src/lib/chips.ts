// Turning a chip count into the stacks of coloured chips we draw.
// Pure: no React, no Firebase.

/**
 * Chip values from biggest to smallest, like a real chip set. The smallest is the engine's
 * CHIP_UNIT (5): every bet and pot is a multiple of it, so these can draw any amount.
 */
export const DENOMINATIONS = [1000, 500, 100, 25, 10, 5] as const

/** A stack taller than this stops growing. The number beside it still tells the truth. */
export const MAX_CHIPS_PER_STACK = 6

export interface ChipPile {
  /** What each chip in this pile is worth. */
  value: number
  /** How many chips of that value make up the amount. */
  count: number
}

/**
 * Splits an amount into the fewest chips, biggest first: 1,265 is one 1000, two 100s,
 * two 25s, one 10 and one 5. For any multiple of 5 the chips add up to exactly the amount;
 * anything below 5 left over (which the game never produces) simply isn't drawn.
 */
export function chipsFor(amount: number): ChipPile[] {
  const piles: ChipPile[] = []
  let left = Math.max(0, Math.floor(amount))
  for (const value of DENOMINATIONS) {
    const count = Math.floor(left / value)
    if (count > 0) {
      piles.push({ value, count })
      left -= count * value
    }
  }
  return piles
}

/** How many chips of a pile to actually draw. */
export function visibleCount(count: number): number {
  return Math.min(count, MAX_CHIPS_PER_STACK)
}
