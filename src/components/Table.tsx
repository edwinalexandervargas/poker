import { AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import type { Action } from '@shared/engine'
import { MAX_SEATS } from '@shared/engine/types'
import { ActionBar } from '@/components/ActionBar'
import { BetChips } from '@/components/BetChips'
import { CommunityCards } from '@/components/CommunityCards'
import { Deck } from '@/components/Deck'
import { OpponentSeat } from '@/components/OpponentSeat'
import { PotDisplay } from '@/components/PotDisplay'
import { Seat } from '@/components/Seat'
import { TurnTimer } from '@/components/TurnTimer'
import { getBettingOptions } from '@/lib/betting'
import { describeResult } from '@/lib/resultText'
import { betSpot, layoutSeats, MY_SPOT } from '@/lib/seatLayout'
import { useDealPlan } from '@/lib/useDealPlan'
import { seatAt, type TableState } from '@/lib/fakeTable'
import type { TurnClock } from '@/lib/turnClock'

interface TableProps {
  table: TableState
  code: string
  onAction: (action: Action) => void
  /** A request to the server is in flight: freeze the buttons so a double click can't send two. */
  pending?: boolean
  /** A friendly message when the server refused something. */
  error?: string | null
  /** Shown once the hand is over. Missing when the whole game is over. */
  onNextHand?: () => void
  /** Fewer than two players have chips: no more hands. */
  gameOver?: boolean
  /** The countdown for whoever is on the clock. */
  turn?: TurnClock | null
  /** I'm out of chips and may buy back in. */
  canRebuy?: boolean
  rebuyAmount?: number
  onRebuy?: () => void
}

/** The whole table screen. It draws whatever TableState it is given. */
export function Table({
  table,
  code,
  onAction,
  pending = false,
  error = null,
  onNextHand,
  gameOver = false,
  turn = null,
  canRebuy = false,
  rebuyAmount = 0,
  onRebuy,
}: TableProps) {
  const me = seatAt(table, table.mySeat)!
  const others = table.seats.filter((s) => s.seat !== table.mySeat)
  const handOver = table.phase === 'complete'
  const button = table.seats.find((s) => s.isDealer)?.seat
  const dealtIn = Array.from(
    { length: MAX_SEATS },
    (_, seat) => seatAt(table, seat)?.dealtIn === true,
  )
  const dealPlan = useDealPlan(table.handNumber, table.phase, button, dealtIn)
  const spots = layoutSeats(
    table.seats.map((s) => s.seat),
    table.mySeat,
    MAX_SEATS,
  )
  const names = Object.fromEntries(table.seats.map((s) => [s.seat, s.name]))
  const resultText = table.result
    ? describeResult(table.result, table.mySeat, names)
    : null
  const acting = table.seats.find((s) => s.isToAct)
  const awayActing = acting && acting.seat !== table.mySeat && acting.away

  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-3 px-4 py-4">
      <header className="flex w-full items-center justify-between text-sm text-white/60">
        <Link to="/" className="underline underline-offset-4">
          Leave
        </Link>
        <span className="tracking-widest uppercase">Table {code}</span>
        <span className="capitalize">{table.phase}</span>
      </header>

      {/* The table: everyone else around the oval, board and pot in the middle. */}
      <div className="relative mt-2 aspect-[4/5] w-full max-w-2xl sm:aspect-[16/11]">
        <section className="border-rail bg-felt-700 absolute inset-x-[4%] inset-y-[14%] flex flex-col items-center justify-center gap-2 rounded-[45%] border-[6px] shadow-[inset_0_0_40px_rgb(0_0_0/0.45)] sm:inset-x-[8%]">
          <Deck key={`deck-${table.handNumber}`} shuffle={dealPlan !== null} />
          <PotDisplay pot={table.pot} />
          <CommunityCards key={`board-${table.handNumber}`} cards={table.community} />
        </section>

        {/* Bets on the felt, between each seat and the pot. Keyed by street, so when a
            betting round ends they all sweep into the pot together. */}
        <AnimatePresence>
          {table.seats
            .filter((seat) => seat.bet > 0)
            .map((seat) => {
              const from = seat.seat === table.mySeat ? MY_SPOT : spots.get(seat.seat)!
              return (
                <BetChips
                  key={`${table.handNumber}-${table.phase}-${seat.seat}`}
                  amount={seat.bet}
                  from={from}
                  to={betSpot(from)}
                />
              )
            })}
        </AnimatePresence>

        {others.map((seat) => {
          const spot = spots.get(seat.seat)!
          return (
            <div
              key={seat.seat}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
            >
              <OpponentSeat
                seat={seat}
                handNumber={table.handNumber}
                dealDelays={dealPlan?.delays[seat.seat]}
              />
            </div>
          )
        })}
      </div>

      {/* Me: pulled up into the space under the oval. */}
      <div className="relative -mt-14 sm:-mt-16">
        <Seat
          seat={me}
          handNumber={table.handNumber}
          dealDelays={dealPlan?.delays[me.seat]}
        />
      </div>

      {awayActing && (
        <p
          role="status"
          className="rounded-full bg-black/40 px-3 py-1 text-sm text-white/70"
        >
          {acting.name} seems to be away. The clock keeps running.
        </p>
      )}

      {canRebuy && (
        <div className="flex w-full max-w-md flex-col items-center gap-2 rounded-2xl bg-black/40 p-4 text-center">
          <p className="font-semibold">You’re out of chips.</p>
          <button
            type="button"
            onClick={onRebuy}
            disabled={pending}
            className="bg-chip-gold rounded-lg px-8 py-3 font-semibold text-black disabled:opacity-50"
          >
            {pending ? 'Buying in…' : `Rebuy for ${rebuyAmount.toLocaleString()}`}
          </button>
          <p className="text-sm text-white/60">You’ll be dealt in from the next hand.</p>
        </div>
      )}

      {handOver ? (
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-black/40 p-4 text-center">
          {resultText && (
            <p role="status" className="text-lg font-bold">
              {resultText}
            </p>
          )}
          {gameOver ? (
            <p className="text-lg font-bold">
              {me.stack > 0
                ? 'You won the game!'
                : `${table.seats.find((s) => s.stack > 0)?.name ?? 'Someone'} won the game.`}
            </p>
          ) : (
            <>
              {!resultText && <p className="text-lg font-bold">Hand over</p>}
              <button
                type="button"
                onClick={onNextHand}
                disabled={pending}
                className="bg-chip-gold rounded-lg px-8 py-3 font-semibold text-black disabled:opacity-50"
              >
                {pending ? 'Dealing…' : 'Next hand'}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {turn && acting && (
            <TurnTimer
              key={turn.deadline}
              turn={turn}
              label={acting.seat === table.mySeat ? 'Your turn' : `${acting.name}’s turn`}
            />
          )}
          {me.inHand ? (
            <ActionBar
              options={getBettingOptions(table)}
              disabled={!me.isToAct || pending}
              onAction={onAction}
            />
          ) : (
            <p className="text-white/60">
              {me.dealtIn
                ? 'You folded. Waiting for the hand to finish…'
                : 'You’re dealt in from the next hand.'}
            </p>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </main>
  )
}
