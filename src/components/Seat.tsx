import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DealerButton } from '@/components/DealerButton'
import { FlyIn } from '@/components/FlyIn'
import { WonBadge } from '@/components/WonBadge'
import type { SeatState } from '@/lib/fakeTable'
import type { TurnClock } from '@/lib/turnClock'

interface SeatProps {
  seat: SeatState
  /** The hand being played. Part of each card's identity, so a new hand deals new cards. */
  handNumber?: number
  /** Seconds until each of this seat's two cards leaves the deck. Omit to just show them. */
  dealDelays?: [number, number]
  /** The clock, when it's my turn: drawn as a ring round my avatar. */
  turn?: TurnClock | null
  /** Chips won in the hand that just ended, shown as a badge. */
  won?: number
}

/** Your spot at the table: cards and name plate. Your bet sits on the felt (see BetChips). */
export function Seat({
  seat,
  handNumber = 0,
  dealDelays,
  turn = null,
  won = 0,
}: SeatProps) {
  const { name, stack, isDealer, isToAct, inHand, holeCards } = seat

  return (
    <div
      className={`landscape-phone:flex-row tiny:!flex-row relative flex flex-row items-center gap-3 transition-opacity sm:flex-col ${
        inHand ? 'opacity-100' : 'opacity-45'
      }`}
      aria-label={`${name}'s seat`}
    >
      {/* Hole cards: face up when we know them, face down when we don't. Slightly fanned. */}
      <div className="landscape-phone:min-h-16 tiny:!min-h-0 flex min-h-24 sm:min-h-28">
        {inHand &&
          [0, 1].map((i) => {
            // The same two slots all hand long: a card arrives face down, and flips over
            // when its face becomes known (my own cards, or both at showdown).
            const delay = dealDelays?.[i]
            const tilt =
              i === 0
                ? '-rotate-[4deg] translate-x-0.5'
                : 'rotate-[4deg] -translate-x-0.5 translate-y-0.5'
            const card = (
              <Card
                card={holeCards?.[i]}
                faceUp={holeCards !== undefined}
                startFaceDown={delay !== undefined}
                delay={delay === undefined ? 0 : delay + 0.45}
              />
            )
            return delay === undefined ? (
              <div key={`${handNumber}-${i}`} className={`origin-bottom ${tilt}`}>
                {card}
              </div>
            ) : (
              <FlyIn
                key={`${handNumber}-${i}`}
                delay={delay}
                className={`origin-bottom ${tilt}`}
              >
                {card}
              </FlyIn>
            )
          })}
      </div>

      {/* Name plate: avatar, name and the chips I have behind. Glows while it is my turn. */}
      <div
        className={`panel landscape-phone:min-w-36 landscape-phone:py-1.5 relative flex min-w-36 items-center gap-2.5 rounded-full py-2 pr-5 pl-2 sm:min-w-44 ${
          isToAct ? 'animate-turn-glow' : won > 0 ? 'ring-brass/80 ring-2' : ''
        }`}
      >
        {won > 0 && <WonBadge amount={won} className="absolute -top-3 left-6" />}
        <Avatar
          name={name}
          seat={seat.seat}
          className="landscape-phone:size-9 size-10 text-lg"
          turn={isToAct ? turn : null}
        />
        <div className="text-left leading-tight">
          <p className="text-sm font-semibold">{name}</p>
          <p className="font-num text-lg leading-none">{stack.toLocaleString()}</p>
        </div>
        {isDealer && <DealerButton className="absolute -top-2 -right-2 size-6 text-xs" />}
      </div>
    </div>
  )
}
