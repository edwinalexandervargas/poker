import { motion, useReducedMotion } from 'motion/react'

const CARDS_IN_PILE = 6

interface DeckProps {
  /** Play the shuffle (riffle the pile) when this appears. */
  shuffle: boolean
}

/**
 * The deck, just left of the pot. Dealt cards fly out of it (see FlyIn, which finds it
 * through `data-deck`). Mount it with `key={handNumber}` so every new hand shuffles again.
 */
export function Deck({ shuffle }: DeckProps) {
  const reduceMotion = useReducedMotion()
  const riffle = shuffle && !reduceMotion

  return (
    <div
      data-deck
      aria-hidden
      // It sits in the same row as the pot, so it can't cover it at any table shape. On a phone
      // turned sideways it fades out after the deal (it stays in place, invisible, so dealt
      // cards can still be measured flying out of it).
      className={`landscape-phone:h-11 landscape-phone:w-8 tiny:h-9 tiny:w-6 relative h-10 w-7 shrink-0 transition-opacity duration-700 sm:h-12 sm:w-9 ${
        shuffle ? '' : 'landscape-phone:opacity-0'
      }`}
    >
      {Array.from({ length: CARDS_IN_PILE }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        return (
          <motion.div
            key={i}
            className="card-back absolute inset-0 rounded-md shadow"
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
            <div className="absolute inset-0.5 rounded-sm border border-[#e3be62]/30" />
          </motion.div>
        )
      })}
    </div>
  )
}
