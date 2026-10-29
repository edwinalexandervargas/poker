import { Card } from '@/components/Card'
import { ChipStack } from '@/components/ChipStack'
import { FlyIn } from '@/components/FlyIn'
import type { SeatState } from '@/lib/fakeTable'

interface SeatProps {
  seat: SeatState
  /** The hand being played. Part of each card's identity, so a new hand deals new cards. */
  handNumber?: number
  /** Seconds until each of this seat's two cards leaves the deck. Omit to just show them. */
  dealDelays?: [number, number]
}

/** One player's spot at the table: cards, name plate, and the chips they've bet. */
export function Seat({ seat, handNumber = 0, dealDelays }: SeatProps) {
  const { name, stack, bet, isDealer, isToAct, inHand, holeCards } = seat

  return (
    <div
      className={`flex flex-col items-center gap-3 transition-opacity ${
        inHand ? 'opacity-100' : 'opacity-40'
      }`}
      aria-label={`${name}'s seat`}
    >
      {/* Chips bet this round. Reserve the space so seats don't jump when a bet appears. */}
      <div className="flex h-14 items-end gap-2">
        {bet > 0 && (
          <>
            <ChipStack amount={bet} />
            <span className="text-sm font-bold">{bet.toLocaleString()}</span>
          </>
        )}
      </div>

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
          className={`relative min-w-36 rounded-xl bg-black/40 px-4 py-2 text-center ${
            isToAct ? 'animate-turn-glow ring-chip-gold ring-2' : ''
          }`}
        >
          {isDealer && (
            <span
              className="bg-chip-gold absolute -top-3 -right-3 flex size-7 items-center justify-center rounded-full text-sm font-bold text-black"
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
