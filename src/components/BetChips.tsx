import { motion, useReducedMotion } from 'motion/react'
import { POT_SPOT, type Spot } from '@/lib/seatLayout'

interface BetChipsProps {
  amount: number
  /** Where the player sits: the chips slide out from here. */
  from: Spot
  /** Where the chips rest on the felt. */
  to: Spot
}

const pct = (n: number) => `${n}%`

/**
 * One player's bet on the felt, shown as its amount. It slides out from their seat when placed, and when the
 * betting round ends (the bet disappears) it sweeps into the pot. Wrap a list of these in
 * <AnimatePresence> so the sweep can play.
 */
export function BetChips({ amount, from, to }: BetChipsProps) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
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
      <span className="glass-dark rounded-full px-[clamp(0.3rem,1.2cqw,0.5rem)] py-[clamp(0rem,0.3cqw,0.125rem)] text-[clamp(0.6rem,1.9cqw,0.8rem)] leading-tight font-bold">
        {amount.toLocaleString()}
      </span>
    </motion.div>
  )
}
