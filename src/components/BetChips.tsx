import { m, useReducedMotion } from 'motion/react'
import { seatColor } from '@/lib/seatColors'
import { POT_SPOT, type Spot } from '@/lib/seatLayout'

interface BetChipsProps {
  amount: number
  /** The chip is drawn in the bettor's seat colour. */
  seat: number
  /** Where the player sits: the chips slide out from here. */
  from: Spot
  /** Where the chips rest on the felt. */
  to: Spot
}

const pct = (n: number) => `${n}%`

/**
 * One player's bet on the felt: a chip in their colour and the amount. It slides out from their seat when placed, and when the
 * betting round ends (the bet disappears) it sweeps into the pot. Wrap a list of these in
 * <AnimatePresence> so the sweep can play.
 */
export function BetChips({ amount, seat, from, to }: BetChipsProps) {
  const reduceMotion = useReducedMotion()
  return (
    <m.div
      className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0.5"
      initial={
        reduceMotion
          ? false
          : { left: pct(from.left), top: pct(from.top), opacity: 0, scale: 0.7 }
      }
      animate={{ left: pct(to.left), top: pct(to.top), opacity: 1, scale: 1 }}
      exit={
        reduceMotion
          ? { opacity: 0 }
          : { left: pct(POT_SPOT.left), top: pct(POT_SPOT.top), opacity: 0, scale: 0.6 }
      }
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <span className="glass-dark font-num flex items-center gap-[0.3em] rounded-full py-[0.2em] pr-[0.55em] pl-[0.2em] text-[clamp(0.66rem,2cqw,0.9rem)] leading-none">
        <span
          className="chip-token text-[1.25em]"
          style={{ ['--chip' as string]: seatColor(seat) }}
          aria-hidden
        />
        {amount.toLocaleString()}
      </span>
    </m.div>
  )
}
