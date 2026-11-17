import { Avatar } from '@/components/Avatar'
import { Card } from '@/components/Card'
import { DealerButton } from '@/components/DealerButton'
import { FlyIn } from '@/components/FlyIn'
import { WonBadge } from '@/components/WonBadge'
import type { SeatState } from '@/lib/fakeTable'
import type { TurnClock } from '@/lib/turnClock'

interface OpponentSeatProps {
  seat: SeatState
  /** The hand being played. Part of each card's identity, so a new hand deals new cards. */
  handNumber?: number
  /** Seconds until each of this seat's two cards leaves the deck. Omit to just show them. */
  dealDelays?: [number, number]
  /** The clock, when it's this player's turn: drawn as a ring round their avatar. */
  turn?: TurnClock | null
  /** Chips won in the hand that just ended, shown as a badge. */
  won?: number
}

/**
 * Another player's spot around the table: a compact version of Seat, small enough that
 * seven of them fit around the felt on a phone. Two small cards, fanned, over a plate with
 * the player's avatar, name and chips.
 */
export function OpponentSeat({
  seat,
  handNumber = 0,
  dealDelays,
  turn = null,
  won = 0,
}: OpponentSeatProps) {
  const { name, stack, isDealer, isToAct, inHand, dealtIn, away, holeCards } = seat
  const shown = holeCards !== undefined

  const status = away
    ? { text: 'Away', className: 'text-amber-300' }
    : !dealtIn && stack > 0
      ? { text: 'Next hand', className: 'text-muted' }
      : stack === 0 && !inHand
        ? { text: 'Out', className: 'text-muted' }
        : null

  return (
    <div
      className={`relative flex w-[5.4rem] flex-col items-center transition-opacity sm:w-28 ${
        inHand || !dealtIn ? 'opacity-100' : 'opacity-45'
      }`}
      aria-label={`${name}'s seat`}
    >
      {/* Two small cards: face down and fanned, or side by side once shown at showdown. */}
      <div className="relative z-0 -mb-2 flex h-12 sm:h-14">
        {inHand &&
          [0, 1].map((i) => {
            const delay = dealDelays?.[i]
            const tilt = shown
              ? ''
              : i === 0
                ? '-rotate-6 translate-x-1'
                : 'rotate-6 -translate-x-1'
            const card = (
              <Card
                size="sm"
                card={holeCards?.[i]}
                faceUp={shown}
                startFaceDown={delay !== undefined}
                delay={delay === undefined ? 0 : delay + 0.45}
              />
            )
            return delay === undefined ? (
              <div
                key={`${handNumber}-${i}`}
                className={`origin-bottom transition-transform ${tilt}`}
              >
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

      <div
        className={`glass-dark relative z-10 flex w-full items-center gap-1.5 rounded-full py-1 pr-2 pl-1 sm:gap-2 ${
          isToAct ? 'animate-turn-glow' : won > 0 ? 'ring-brass/80 ring-2' : ''
        }`}
      >
        {won > 0 && (
          <WonBadge amount={won} className="absolute -top-3 left-1/2 -translate-x-1/2" />
        )}
        <Avatar
          name={name}
          seat={seat.seat}
          className="size-7 text-[0.8rem] sm:size-9 sm:text-base"
          turn={isToAct ? turn : null}
          away={away}
        />
        <div className="min-w-0 flex-1 text-left leading-tight">
          <p className="truncate text-[0.7rem] font-semibold sm:text-[0.8rem]">{name}</p>
          {status ? (
            <p
              className={`truncate text-[0.62rem] font-medium whitespace-nowrap sm:text-[0.7rem] ${status.className}`}
            >
              {status.text}
            </p>
          ) : (
            <p className="font-num text-paper/90 text-[0.78rem] sm:text-[0.9rem]">
              {stack.toLocaleString()}
            </p>
          )}
        </div>
        {isDealer && (
          <DealerButton className="absolute -top-2 -right-1.5 size-5 text-[0.6rem]" />
        )}
      </div>
    </div>
  )
}
