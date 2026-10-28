import { Card } from '@/components/Card'
import type { SeatState } from '@/lib/fakeTable'

interface SeatProps {
  seat: SeatState
}

/** One player's spot at the table: cards, name plate, and the chips they've bet. */
export function Seat({ seat }: SeatProps) {
  const { name, stack, bet, isDealer, isToAct, inHand, holeCards } = seat

  return (
    <div
      className={`flex flex-col items-center gap-3 transition-opacity ${
        inHand ? 'opacity-100' : 'opacity-40'
      }`}
      aria-label={`${name}'s seat`}
    >
      {/* Chips bet this round. Reserve the space so seats don't jump when a bet appears. */}
      <div className="h-8">
        {bet > 0 && (
          <span className="bg-chip-gold inline-block rounded-full px-3 py-1 text-sm font-bold text-black">
            {bet.toLocaleString()}
          </span>
        )}
      </div>

      {/* Hole cards: face up when we know them, face down when we don't. */}
      <div className="flex min-h-28 gap-2">
        {inHand &&
          (holeCards
            ? holeCards.map((card) => <Card key={card} card={card} faceUp />)
            : [0, 1].map((i) => <Card key={i} faceUp={false} />))}
      </div>

      {/* Name plate. Glows while it is this player's turn. */}
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
    </div>
  )
}
