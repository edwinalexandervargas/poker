import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { Card as CardCode, Suit } from '@shared/engine'

const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RED_SUITS: ReadonlySet<Suit> = new Set(['h', 'd'])

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

const SIZE_CLASSES = {
  md: {
    box: 'h-24 w-16 sm:h-28 sm:w-20',
    text: 'text-2xl sm:text-3xl',
    inset: 'inset-2',
  },
  board: {
    box: 'h-16 w-11 sm:h-24 sm:w-16',
    text: 'text-lg sm:text-2xl',
    inset: 'inset-1 sm:inset-2',
  },
  sm: { box: 'h-12 w-8 sm:h-14 sm:w-10', text: 'text-sm sm:text-base', inset: 'inset-1' },
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
  const rank = card ? card[0] : ''
  const suit = card ? (card[1] as Suit) : undefined
  const displayRank = rank === 'T' ? '10' : rank

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
        <div className="bg-card-back absolute inset-0 rounded-lg border-2 border-white shadow-lg [backface-visibility:hidden]">
          <div
            className={`absolute ${sizes.inset} rounded-md border border-white/40 bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgb(255_255_255/0.12)_6px_8px)]`}
          />
        </div>

        {/* Face (pre-rotated so it shows when the card is flipped) */}
        <div
          className={`absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center rounded-lg border border-slate-300 bg-white shadow-lg [backface-visibility:hidden] ${
            suit && RED_SUITS.has(suit) ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          <span className={`${sizes.text} leading-none font-bold`}>{displayRank}</span>
          <span className={`${sizes.text} leading-none`}>
            {suit ? SUIT_SYMBOL[suit] : ''}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
