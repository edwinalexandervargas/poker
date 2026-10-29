import type { Card as CardCode, Suit } from '@shared/engine'

const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' }
const RED_SUITS: ReadonlySet<Suit> = new Set(['h', 'd'])

export type FaceSize = 'md' | 'board' | 'sm'

// Type sizes for each card size. The card itself changes size with the screen (see Card.tsx),
// so these follow the same breakpoints: phone, sm (tablet/desktop), and a phone turned sideways.
const TYPE = {
  md: {
    rank: 'text-[22px] sm:text-[26px] landscape-phone:text-[17px]',
    suit: 'text-[13px] sm:text-[15px] landscape-phone:text-[12px]',
    big: 'text-[38px] sm:text-[46px] landscape-phone:text-[26px]',
  },
  board: {
    rank: 'text-[16px] sm:text-[22px] landscape-phone:text-[13px]',
    suit: 'text-[10px] sm:text-[13px] landscape-phone:text-[9px]',
    big: 'text-[26px] sm:text-[38px] landscape-phone:text-[18px]',
  },
} as const

/**
 * The printed side of a card: a big rank and suit in the top-left corner and one large suit
 * in the bottom-right. Readable at a glance at every size, which is what matters at a table
 * (the style poker apps use), and the same on every screen.
 */
export function CardFace({ card, size }: { card: CardCode; size: FaceSize }) {
  const rank = card[0]!
  const suit = card[1] as Suit
  const symbol = SUIT_SYMBOL[suit]
  const label = rank === 'T' ? '10' : rank
  const ink = RED_SUITS.has(suit) ? 'text-[#c8202b]' : 'text-[#16191b]'

  // The small cards at other players' seats: just the rank over the suit.
  if (size === 'sm') {
    return (
      <div
        className={`flex h-full flex-col items-center justify-center ${ink}`}
        aria-label={`${label} of ${suitName(suit)}`}
      >
        <span className="text-sm leading-none font-bold tracking-tight sm:text-base">
          {label}
        </span>
        <span className="text-xs leading-none sm:text-sm">{symbol}</span>
      </div>
    )
  }

  const t = TYPE[size]
  return (
    <div
      className={`relative h-full w-full ${ink}`}
      aria-label={`${label} of ${suitName(suit)}`}
    >
      <span className="absolute top-[5%] left-[9%] flex flex-col items-center leading-none">
        <span className={`${t.rank} font-bold tracking-[-0.06em]`}>{label}</span>
        <span className={t.suit}>{symbol}</span>
      </span>
      <span
        className={`absolute right-[9%] bottom-[5%] ${t.big} leading-none`}
        aria-hidden
      >
        {symbol}
      </span>
    </div>
  )
}

function suitName(suit: Suit): string {
  return { s: 'spades', h: 'hearts', d: 'diamonds', c: 'clubs' }[suit]
}
