import { Card } from '@/components/Card'
import { ChipStack } from '@/components/ChipStack'
import { FlyIn } from '@/components/FlyIn'
import type { SeatState } from '@/lib/fakeTable'

interface OpponentSeatProps {
  seat: SeatState
  /** The hand being played. Part of each card's identity, so a new hand deals new cards. */
  handNumber?: number
  /** Seconds until each of this seat's two cards leaves the deck. Omit to just show them. */
  dealDelays?: [number, number]
}

/**
 * Another player's spot around the table: a compact version of Seat, small enough that
 * seven of them fit around the felt on a phone.
 */
export function OpponentSeat({ seat, handNumber = 0, dealDelays }: OpponentSeatProps) {
  const { name, stack, bet, isDealer, isToAct, inHand, dealtIn, away, holeCards } = seat

  return (
    <div
      className={`flex w-20 flex-col items-center gap-1 transition-opacity sm:w-28 ${
        inHand || !dealtIn ? 'opacity-100' : 'opacity-40'
      }`}
      aria-label={`${name}'s seat`}
    >
      {/* Two small cards: face down, or face up once shown at showdown. */}
      <div className="flex h-12 gap-0.5 sm:h-14">
        {inHand &&
          [0, 1].map((i) => {
            const delay = dealDelays?.[i]
            const card = (
              <Card
                size="sm"
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

      <div
        className={`relative w-full rounded-lg bg-black/60 px-1.5 py-1 text-center shadow ${
          isToAct ? 'animate-turn-glow ring-chip-gold ring-2' : ''
        }`}
      >
        {isDealer && (
          <span
            className="bg-chip-gold absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full text-[0.65rem] font-bold text-black"
            title="Dealer button"
          >
            D
          </span>
        )}
        <p className="truncate text-xs font-semibold sm:text-sm">{name}</p>
        <p className="text-[0.7rem] text-white/70 sm:text-xs">
          {stack > 0 || inHand ? stack.toLocaleString() : 'Out'}
        </p>
        {away && <p className="text-[0.65rem] text-amber-300">away</p>}
        {!dealtIn && stack > 0 && (
          <p className="text-[0.65rem] text-white/60">next hand</p>
        )}
      </div>

      {/* Chips bet this round. The space is kept so seats don't jump. */}
      <div className="flex h-6 items-center gap-1">
        {bet > 0 && (
          <>
            <ChipStack amount={bet} size="sm" />
            <span className="text-xs font-bold">{bet.toLocaleString()}</span>
          </>
        )}
      </div>
    </div>
  )
}
