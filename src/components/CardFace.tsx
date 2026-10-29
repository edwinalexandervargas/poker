import type { Card as CardCode, Suit } from '@shared/engine'
import { pipsFor } from '@/lib/pips'

const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RED_SUITS: ReadonlySet<Suit> = new Set(['h', 'd'])

export type FaceSize = 'md' | 'board' | 'sm'

// Type sizes per card size: the corner index, the pips, the ace's big pip, the court letter.
const TYPE = {
  md: {
    rank: 'text-[15px] sm:text-[18px]',
    suit: 'text-[11px] sm:text-[13px]',
    pip: 'text-[13px] sm:text-[17px]',
    ace: 'text-[40px] sm:text-[50px]',
    court: 'text-[26px] sm:text-[32px]',
    index: 'top-1 left-1 sm:left-1.5',
    // Written out in full (not built from `index`) so Tailwind can see the class names.
    indexFlipped: 'right-1 bottom-1 sm:right-1.5',
  },
  board: {
    rank: 'text-[11px] sm:text-[15px]',
    suit: 'text-[8px] sm:text-[11px]',
    pip: 'text-[9px] sm:text-[13px]',
    ace: 'text-[26px] sm:text-[40px]',
    court: 'text-[17px] sm:text-[26px]',
    index: 'top-0.5 left-0.5 sm:top-1 sm:left-1',
    indexFlipped: 'right-0.5 bottom-0.5 sm:right-1 sm:bottom-1',
  },
} as const

/**
 * The printed side of a card, drawn like a real deck: a corner index top-left and (upside
 * down) bottom-right, the right number of pips in the classic pattern, one big pip on an ace,
 * and a framed court panel on J, Q and K.
 */
export function CardFace({ card, size }: { card: CardCode; size: FaceSize }) {
  const rank = card[0]!
  const suit = card[1] as Suit
  const symbol = SUIT_SYMBOL[suit]
  const red = RED_SUITS.has(suit)
  const label = rank === 'T' ? '10' : rank
  const ink = red ? 'text-[#c8202b]' : 'text-[#16191b]'

  // The small cards at other players' seats are too small for a real layout.
  if (size === 'sm') {
    return (
      <div className={`flex h-full flex-col items-center justify-center ${ink}`}>
        <span className="text-sm leading-none font-bold tracking-tight sm:text-base">
          {label}
        </span>
        <span className="text-xs leading-none sm:text-sm">{symbol}</span>
      </div>
    )
  }

  const t = TYPE[size]
  const index = (
    <span className="flex flex-col items-center leading-none">
      <span className={`${t.rank} font-bold tracking-[-0.06em]`}>{label}</span>
      <span className={t.suit}>{symbol}</span>
    </span>
  )
  const isCourt = rank === 'J' || rank === 'Q' || rank === 'K'

  return (
    <div
      className={`relative h-full w-full ${ink}`}
      aria-label={`${label} of ${suitName(suit)}`}
    >
      {/* Corner indexes: top-left, and the same turned upside down bottom-right. */}
      <div className={`absolute ${t.index}`}>{index}</div>
      <div
        className={`absolute ${t.index.replace(/top/g, 'bottom').replace(/left/g, 'right')} rotate-180`}
      >
        {index}
      </div>

      {rank === 'A' && (
        <span
          className={`absolute inset-0 flex items-center justify-center ${t.ace} leading-none`}
        >
          {symbol}
        </span>
      )}

      {isCourt && (
        // A framed court panel, split corner to corner and mirrored like a real court card.
        <div
          className={`absolute inset-x-[22%] inset-y-[14%] overflow-hidden rounded-[3px] border ${
            red ? 'border-[#c8202b]/70' : 'border-[#16191b]/70'
          }`}
          style={{
            background: `linear-gradient(135deg, ${red ? '#fbe3dc' : '#e2e8ef'} 0 49.6%, ${
              red ? '#f7d27a' : '#f2d589'
            } 50.4% 100%)`,
          }}
        >
          <span className={`absolute top-[6%] left-[10%] ${t.suit}`}>{symbol}</span>
          <span className={`absolute right-[10%] bottom-[6%] rotate-180 ${t.suit}`}>
            {symbol}
          </span>
          <span
            className={`absolute inset-0 flex items-center justify-center font-serif font-bold ${t.court} leading-none`}
          >
            {label}
          </span>
        </div>
      )}

      {pipsFor(rank).map((p, i) => (
        <span
          key={i}
          className={`absolute -translate-x-1/2 -translate-y-1/2 leading-none ${t.pip} ${p.flip ? 'rotate-180' : ''}`}
          style={{ left: `${p.x}%`, top: `${p.y}%` }}
          aria-hidden
        >
          {symbol}
        </span>
      ))}
    </div>
  )
}

function suitName(suit: Suit): string {
  return { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[suit]
}
