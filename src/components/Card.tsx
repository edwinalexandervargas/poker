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
  className?: string
}

/** A playing card that flips between back and face using rotateY. */
export function Card({
  card,
  faceUp,
  delay = 0,
  startFaceDown = false,
  className = '',
}: CardProps) {
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
    <div className={`h-24 w-16 [perspective:800px] sm:h-28 sm:w-20 ${className}`}>
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
          <div className="absolute inset-2 rounded-md border border-white/40 bg-[repeating-linear-gradient(45deg,transparent_0_6px,rgb(255_255_255/0.12)_6px_8px)]" />
        </div>

        {/* Face (pre-rotated so it shows when the card is flipped) */}
        <div
          className={`absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center rounded-lg border border-slate-300 bg-white shadow-lg [backface-visibility:hidden] ${
            suit && RED_SUITS.has(suit) ? 'text-red-600' : 'text-slate-900'
          }`}
        >
          <span className="text-2xl leading-none font-bold sm:text-3xl">
            {displayRank}
          </span>
          <span className="text-2xl leading-none sm:text-3xl">
            {suit ? SUIT_SYMBOL[suit] : ''}
          </span>
        </div>
      </motion.div>
    </div>
  )
}
