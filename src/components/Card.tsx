import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Card as CardCode } from '@shared/engine'
import { CardFace } from '@/components/CardFace'

interface CardProps {
  /** The card to show. Omit for an opponent's hidden card. */
  card?: CardCode
  faceUp: boolean
  /** Delay (seconds) before the flip starts. Handy for staggering the flop. Only the first flip waits. */
  delay?: number
  /** Arrive showing the back, then flip, instead of appearing already turned over. */
  startFaceDown?: boolean
  /** 'md' for your own cards, 'board' for the middle of the table, 'sm' for other seats. */
  size?: 'md' | 'board' | 'sm'
  className?: string
}

// Each size: the card box, the corner index (rank + small suit), and the big centre suit.
// The small seat cards are too small for a corner index, so they show rank and suit stacked.
const SIZE_CLASSES = {
  md: {
    box: 'h-24 w-16 sm:h-28 sm:w-20 landscape-phone:h-[4.5rem] landscape-phone:w-12',
    rank: 'text-xl sm:text-2xl',
    pip: 'text-xs sm:text-sm',
    centre: 'text-4xl sm:text-5xl',
    corner: 'top-1.5 left-2',
    inset: 'inset-2',
  },
  board: {
    box: 'h-16 w-11 sm:h-24 sm:w-16 landscape-phone:h-[3.1rem] landscape-phone:w-[2.2rem]',
    rank: 'text-base sm:text-xl',
    pip: 'text-[0.6rem] sm:text-xs',
    centre: 'text-2xl sm:text-4xl',
    corner: 'top-1 left-1.5 sm:top-1.5 sm:left-2',
    inset: 'inset-1 sm:inset-2',
  },
  sm: {
    box: 'h-12 w-8 sm:h-14 sm:w-10 landscape-phone:h-11 landscape-phone:w-[1.85rem]',
    rank: 'text-sm sm:text-base',
    pip: 'text-xs sm:text-sm',
    centre: '',
    corner: '',
    inset: 'inset-1',
  },
} as const

/** A playing card that flips between back and face using rotateY. */
export function Card({
  card,
  faceUp,
  delay = 0,
  startFaceDown = false,
  size = 'md',
  className = '',
}: CardProps) {
  const sizes = SIZE_CLASSES[size]
  const reduceMotion = useReducedMotion()
  // The delay is for the card's first flip only. Later flips (like an opponent's cards
  // turning over at showdown) shouldn't wait for it again.
  const [settled, setSettled] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return
    const timer = setTimeout(() => setSettled(true), (delay + 0.6) * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div className={`${sizes.box} [perspective:800px] ${className}`}>
      <motion.div
        className="relative h-full w-full [transform-style:preserve-3d]"
        initial={startFaceDown ? { rotateY: 0 } : false}
        animate={{ rotateY: faceUp ? 180 : 0 }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 0.5, ease: 'easeInOut', delay: settled ? 0 : delay }
        }
      >
        {/* Back (visible when rotateY = 0) */}
        <div className="card-back absolute inset-0 rounded-lg shadow-lg [backface-visibility:hidden]">
          <div
            className={`absolute ${sizes.inset} rounded-md border border-[#e3be62]/30`}
          />
        </div>

        {/* Face (pre-rotated so it shows when the card is flipped), printed like a real card. */}
        <div className="absolute inset-0 [transform:rotateY(180deg)] overflow-hidden rounded-lg bg-gradient-to-b from-[#fffdf8] to-[#f1ede3] shadow-[0_6px_16px_rgb(0_0_0/0.45),inset_0_0_0_1px_rgb(0_0_0/0.1)] [backface-visibility:hidden]">
          {card && <CardFace card={card} size={size} />}
        </div>
      </motion.div>
    </div>
  )
}
