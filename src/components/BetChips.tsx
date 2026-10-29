import { motion, useReducedMotion } from 'motion/react'
import { ChipStack } from '@/components/ChipStack'
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
 * One player's bet on the felt. It slides out from their seat when placed, and when the
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
      <ChipStack amount={amount} size="sm" />
      <span className="rounded-full bg-black/60 px-1.5 text-[0.7rem] leading-4 font-bold">
        {amount.toLocaleString()}
      </span>
    </motion.div>
  )
}
