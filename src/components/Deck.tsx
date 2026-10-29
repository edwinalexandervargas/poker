import { motion, useReducedMotion } from 'motion/react'

const CARDS_IN_PILE = 6

interface DeckProps {
  /** Play the shuffle (riffle the pile) when this appears. */
  shuffle: boolean
}

/**
 * The deck in the corner of the felt. Dealt cards fly out of it (see FlyIn, which finds it
 * through `data-deck`). Mount it with `key={handNumber}` so every new hand shuffles again.
 */
export function Deck({ shuffle }: DeckProps) {
  const reduceMotion = useReducedMotion()
  const riffle = shuffle && !reduceMotion

  return (
    <div data-deck aria-hidden className="absolute top-3 left-3 h-16 w-11">
      {Array.from({ length: CARDS_IN_PILE }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        return (
          <motion.div
            key={i}
            className="bg-card-back absolute inset-0 rounded-md border border-white shadow"
            style={{ top: -i * 1.5, left: -i * 0.5 }}
            animate={
              riffle
                ? {
                    x: [0, side * 16, 0, side * -8, 0],
                    rotate: [0, side * 9, 0, side * -5, 0],
                  }
                : undefined
            }
            transition={{ duration: 0.9, delay: i * 0.04, ease: 'easeInOut' }}
          >
            <div className="absolute inset-1 rounded-sm border border-white/40" />
          </motion.div>
        )
      })}
    </div>
  )
}
