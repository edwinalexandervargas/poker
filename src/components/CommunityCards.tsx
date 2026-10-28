import { Card } from '@/components/Card'
import type { Card as CardCode } from '@shared/engine'

const SLOTS = 5

interface CommunityCardsProps {
  /** 0 cards preflop, 3 on the flop, 4 on the turn, 5 on the river. */
  cards: CardCode[]
}

/** The five board positions. Empty ones are drawn as outlines so the layout never shifts. */
export function CommunityCards({ cards }: CommunityCardsProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2" aria-label="Community cards">
      {Array.from({ length: SLOTS }, (_, i) => {
        const card = cards[i]
        return card ? (
          // Cards revealed together (the flop) flip one after another.
          <Card key={card} card={card} faceUp delay={i < 3 ? i * 0.15 : 0} />
        ) : (
          <div
            key={`empty-${i}`}
            className="h-24 w-16 rounded-lg border-2 border-dashed border-white/20 sm:h-28 sm:w-20"
          />
        )
      })}
    </div>
  )
}
