import { useState } from 'react'
import { Card } from '@/components/Card'
import { FlyIn } from '@/components/FlyIn'
import type { Card as CardCode } from '@shared/engine'

const SLOTS = 5

interface CommunityCardsProps {
  /** 0 cards preflop, 3 on the flop, 4 on the turn, 5 on the river. */
  cards: CardCode[]
}

/**
 * The five board positions. Empty ones are drawn as outlines so the layout never shifts.
 * Mount it with `key={handNumber}`. Cards already on the board when it appears (someone
 * reloading mid-hand) are simply shown; cards that arrive afterwards fly in from the deck.
 */
export function CommunityCards({ cards }: CommunityCardsProps) {
  const [alreadyThere] = useState(cards.length)

  return (
    <div className="flex gap-[min(0.5rem,1.2cqw)]" aria-label="Community cards">
      {Array.from({ length: SLOTS }, (_, i) => {
        const card = cards[i]
        if (!card) {
          return (
            <div
              key={`empty-${i}`}
              className="landscape-phone:h-[min(3.1rem,14.6cqw)] landscape-phone:w-[min(2.2rem,10.4cqw)] h-[min(6rem,13cqw)] w-[min(4rem,8.7cqw)] rounded-lg border-2 border-dashed border-white/20"
            />
          )
        }
        if (i < alreadyThere) return <Card key={card} size="board" card={card} faceUp />

        // The flop's three cards leave one after another; the turn and river come alone.
        const delay = i < 3 ? i * 0.15 : 0
        return (
          <FlyIn key={card} delay={delay}>
            <Card size="board" card={card} faceUp startFaceDown delay={delay + 0.45} />
          </FlyIn>
        )
      })}
    </div>
  )
}
