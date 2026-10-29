import { AnimatePresence } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Standing } from '@shared/engine'
import type { Action } from '@shared/engine'
import { MAX_SEATS } from '@shared/engine/types'
import { ActionBar } from '@/components/ActionBar'
import { ActionLog } from '@/components/ActionLog'
import { BetChips } from '@/components/BetChips'
import { CommunityCards } from '@/components/CommunityCards'
import { Deck } from '@/components/Deck'
import { HandHistory } from '@/components/HandHistory'
import { Modal } from '@/components/Modal'
import { OpponentSeat } from '@/components/OpponentSeat'
import { PotDisplay } from '@/components/PotDisplay'
import { ReactionPicker } from '@/components/ReactionPicker'
import { Scoreboard } from '@/components/Scoreboard'
import { Seat } from '@/components/Seat'
import { TurnTimer } from '@/components/TurnTimer'
import { getBettingOptions } from '@/lib/betting'
import { describeResult } from '@/lib/resultText'
import { betSpot, layoutSeats, MY_SPOT } from '@/lib/seatLayout'
import { useDealPlan } from '@/lib/useDealPlan'
import { seatAt, type TableState } from '@/lib/fakeTable'
import type { TurnClock } from '@/lib/turnClock'
import type { LogLine } from '@/lib/useEvents'

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
  /** The action log, oldest line first. */
  log?: LogLine[]
  /** Who's up and who's down tonight. */
  standings?: Standing[]
  /** Send an emoji reaction. */
  onReact?: (emoji: string) => void
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
  log = [],
  standings = [],
  onReact,
}: TableProps) {
  const [panel, setPanel] = useState<'scores' | 'history' | null>(null)
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
        <span className="flex gap-3">
          <button
            type="button"
            onClick={() => setPanel('scores')}
            className="underline underline-offset-4"
          >
            Scores
          </button>
          <button
            type="button"
            onClick={() => setPanel('history')}
            className="underline underline-offset-4"
          >
            History
          </button>
        </span>
      </header>

      {panel === 'scores' && (
        <Modal title="Tonight's results" onClose={() => setPanel(null)}>
          <Scoreboard rows={standings} mySeat={table.mySeat} />
          <p className="mt-3 text-xs text-white/50">
            Updated when each hand ends. Rebuys count as another buy-in.
          </p>
        </Modal>
      )}
      {panel === 'history' && (
        <Modal title="Hand history" onClose={() => setPanel(null)}>
          <HandHistory code={code} />
        </Modal>
      )}

      {/* The table: everyone else around the oval, board and pot in the middle. */}
      <div className="relative mt-2 aspect-[4/5] w-full max-w-2xl sm:aspect-[16/11]">
        <section className="felt absolute inset-x-[4%] inset-y-[14%] flex flex-col items-center justify-center gap-2 rounded-[45%] sm:inset-x-[8%]">
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
          className="glass-dark rounded-full px-3 py-1 text-sm text-white/70"
        >
          {acting.name} seems to be away. The clock keeps running.
        </p>
      )}

      {canRebuy && (
        <div className="glass flex w-full max-w-md flex-col items-center gap-2 rounded-3xl p-4 text-center">
          <p className="font-semibold">You’re out of chips.</p>
          <button
            type="button"
            onClick={onRebuy}
            disabled={pending}
            className="btn btn-gold"
          >
            {pending ? 'Buying in…' : `Rebuy for ${rebuyAmount.toLocaleString()}`}
          </button>
          <p className="text-sm text-white/60">You’ll be dealt in from the next hand.</p>
        </div>
      )}

      {handOver ? (
        <div className="glass flex w-full max-w-md flex-col items-center gap-3 rounded-3xl p-4 text-center">
          {resultText && (
            <p role="status" className="text-lg font-bold">
              {resultText}
            </p>
          )}
          {gameOver ? (
            <>
              <p className="text-lg font-bold">
                {me.stack > 0
                  ? 'You won the game!'
                  : `${table.seats.find((s) => s.stack > 0)?.name ?? 'Someone'} won the game.`}
              </p>
              <div className="w-full text-left">
                <Scoreboard rows={standings} mySeat={table.mySeat} />
              </div>
            </>
          ) : (
            <>
              {!resultText && <p className="text-lg font-bold">Hand over</p>}
              <button
                type="button"
                onClick={onNextHand}
                disabled={pending}
                className="btn btn-gold"
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
              bigBlind={table.bigBlind}
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

      {onReact && <ReactionPicker onReact={onReact} />}
      <ActionLog lines={log} />

      {error && (
        <p role="alert" className="text-red-300">
          {error}
        </p>
      )}
    </main>
  )
}
