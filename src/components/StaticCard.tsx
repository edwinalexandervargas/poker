import type { Card as CardCode } from '@shared/engine'
import { CardFace } from '@/components/CardFace'

/**
 * A face-up card with no animation, for decoration (the lobby). The table's cards use Card,
 * which flips with Motion; this one keeps Motion out of the lobby's download.
 */
export function StaticCard({
  card,
  className = '',
}: {
  card: CardCode
  className?: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-[0.6rem] bg-gradient-to-b from-white to-[#eef1f5] shadow-[0_14px_30px_rgb(0_0_0/0.45),0_1px_2px_rgb(0_0_0/0.3),inset_0_0_0_1px_rgb(15_23_42/0.08)] ${className}`}
    >
      <CardFace card={card} size="md" />
    </div>
  )
}
