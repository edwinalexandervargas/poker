import { Card } from '@/components/Card'
import { ChipStack } from '@/components/ChipStack'
import { FlyIn } from '@/components/FlyIn'
import { ReactionBubble } from '@/components/ReactionBubble'
import type { SeatState } from '@/lib/fakeTable'

interface SeatProps {
  seat: SeatState
  /** The hand being played. Part of each card's identity, so a new hand deals new cards. */
  handNumber?: number
  /** Seconds until each of this seat's two cards leaves the deck. Omit to just show them. */
  dealDelays?: [number, number]
}

/** Your spot at the table: cards and name plate. Your bet sits on the felt (see BetChips). */
export function Seat({ seat, handNumber = 0, dealDelays }: SeatProps) {
  const { name, stack, isDealer, isToAct, inHand, holeCards, reaction } = seat

  return (
    <div
      className={`relative flex flex-col items-center gap-3 transition-opacity ${
        inHand ? 'opacity-100' : 'opacity-40'
      }`}
      aria-label={`${name}'s seat`}
    >
      <ReactionBubble reaction={reaction} />
      {/* Hole cards: face up when we know them, face down when we don't. */}
      <div className="flex min-h-24 gap-2 sm:min-h-28">
        {inHand &&
          [0, 1].map((i) => {
            // The same two slots all hand long: a card arrives face down, and flips over
            // when its face becomes known (my own cards, or both at showdown).
            const delay = dealDelays?.[i]
            const card = (
              <Card
                card={holeCards?.[i]}
                faceUp={holeCards !== undefined}
                startFaceDown={delay !== undefined}
                delay={delay === undefined ? 0 : delay + 0.45}
              />
            )
            return delay === undefined ? (
              <div key={`${handNumber}-${i}`}>{card}</div>
            ) : (
              <FlyIn key={`${handNumber}-${i}`} delay={delay}>
                {card}
              </FlyIn>
            )
          })}
      </div>

      {/* Name plate, with the chips they have left beside it. Glows while it is this player's turn. */}
      <div className="flex items-end gap-3">
        <div
          className={`glass relative min-w-40 rounded-3xl px-5 py-2.5 text-center ${
            isToAct ? 'animate-turn-glow ring-chip-gold ring-2' : ''
          }`}
        >
          {isDealer && (
            <span
              className="absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-[#f6e2a6] to-[#c99a35] text-sm font-bold text-black"
              title="Dealer button"
            >
              D
            </span>
          )}
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-white/70">{stack.toLocaleString()}</p>
        </div>
        <div className="min-h-8">
          <ChipStack amount={stack} size="sm" />
        </div>
      </div>
    </div>
  )
}
