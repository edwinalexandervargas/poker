import { Link } from 'react-router-dom'
import type { Action } from '@shared/engine'
import { ActionBar } from '@/components/ActionBar'
import { CommunityCards } from '@/components/CommunityCards'
import { Deck } from '@/components/Deck'
import { PotDisplay } from '@/components/PotDisplay'
import { Seat } from '@/components/Seat'
import { TurnTimer } from '@/components/TurnTimer'
import { getBettingOptions } from '@/lib/betting'
import { describeResult } from '@/lib/resultText'
import { useDealPlan } from '@/lib/useDealPlan'
import type { TableState } from '@/lib/fakeTable'
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
  /** Someone is out of chips: no more hands. */
  gameOver?: boolean
  /** The countdown for whoever is on the clock. */
  turn?: TurnClock | null
  /** The opponent's screen has stopped checking in. */
  opponentAway?: boolean
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
  opponentAway = false,
}: TableProps) {
  const me = table.seats[table.mySeat]
  const opponent = table.seats[table.mySeat === 0 ? 1 : 0]
  const handOver = table.phase === 'complete'
  const button = table.seats.find((s) => s.isDealer)?.seat
  const dealPlan = useDealPlan(table.handNumber, table.phase, button)
  const resultText = table.result
    ? describeResult(table.result, table.mySeat, [
        table.seats[0].name,
        table.seats[1].name,
      ])
    : null

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center gap-5 px-4 py-6">
      <header className="flex w-full items-center justify-between text-sm text-white/60">
        <Link to="/" className="underline underline-offset-4">
          Leave
        </Link>
        <span className="tracking-widest uppercase">Table {code}</span>
        <span className="capitalize">{table.phase}</span>
      </header>

      {/* Opponent on top, board in the middle, me at the bottom */}
      <Seat
        seat={opponent}
        handNumber={table.handNumber}
        dealDelays={dealPlan?.delays[opponent.seat]}
      />
      {opponentAway && (
        <p
          role="status"
          className="rounded-full bg-black/40 px-3 py-1 text-sm text-white/70"
        >
          {opponent.name} seems to be away. The clock keeps running.
        </p>
      )}

      <section className="border-rail bg-felt-700 relative flex flex-col items-center gap-3 rounded-[2rem] border-4 px-4 py-6 shadow-inner sm:px-8">
        <Deck key={`deck-${table.handNumber}`} shuffle={dealPlan !== null} />
        <PotDisplay pot={table.pot} />
        <CommunityCards key={`board-${table.handNumber}`} cards={table.community} />
      </section>

      <Seat
        seat={me}
        handNumber={table.handNumber}
        dealDelays={dealPlan?.delays[me.seat]}
      />

      {handOver ? (
        <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl bg-black/40 p-4 text-center">
          {resultText && (
            <p role="status" className="text-lg font-bold">
              {resultText}
            </p>
          )}
          {gameOver ? (
            <p className="text-lg font-bold">
              {me.stack > 0 ? 'You won the game!' : `${opponent.name} won the game.`}
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
          {turn && (
            <TurnTimer
              key={turn.deadline}
              turn={turn}
              label={me.isToAct ? 'Your turn' : `${opponent.name}’s turn`}
            />
          )}
          <ActionBar
            options={getBettingOptions(table)}
            disabled={!me.isToAct || pending}
            onAction={onAction}
          />
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
