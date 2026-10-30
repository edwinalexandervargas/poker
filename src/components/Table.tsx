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
import { ChatPanel } from '@/components/ChatPanel'
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
import { SIDEWAYS_PHONE, useMediaQuery } from '@/lib/useMediaQuery'
import { seatAt, type TableState } from '@/lib/fakeTable'
import type { TurnClock } from '@/lib/turnClock'
import type { LogLine } from '@/lib/useEvents'
import type { ChatLine } from '@/lib/useChat'
import { countUnread } from '@/lib/unread'

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
  /** The table chat, oldest first, and how to send a message. */
  chat?: ChatLine[]
  onChat?: (text: string) => Promise<void>
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
  chat = [],
  onChat,
}: TableProps) {
  // Bets are placed in code, so the sideways layout needs to be known here too.
  const sideways = useMediaQuery(SIDEWAYS_PHONE)
  const [panel, setPanel] = useState<'chat' | 'log' | 'scores' | 'history' | null>(null)
  // Chat read up to this time: opening the chat marks everything as read.
  const [chatReadAt, setChatReadAt] = useState(0)
  const latestChat = chat.at(-1)?.at ?? 0
  const chatOpen = panel === 'chat'
  const unread = chatOpen ? 0 : countUnread(chat, table.mySeat, chatReadAt)
  const openChat = () => {
    setChatReadAt(latestChat)
    setPanel('chat')
  }
  const closePanel = () => {
    if (chatOpen) setChatReadAt(latestChat)
    setPanel(null)
  }
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
    <main className="landscape-phone:max-w-5xl mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 sm:gap-3 sm:px-4 sm:py-4">
      <header className="flex w-full items-center justify-between text-sm text-white/60">
        <Link to="/" className="underline underline-offset-4">
          Leave
        </Link>
        <span className="tracking-widest uppercase">
          {/* "Table" is dropped on phones to make room for the three buttons. */}
          <span className="hidden sm:inline">Table </span>
          {code}
        </span>
        <span className="flex gap-3">
          {onChat && (
            <button
              type="button"
              onClick={openChat}
              className="relative mr-1.5 underline underline-offset-4"
              aria-label={unread > 0 ? `Chat, ${unread} unread` : 'Chat'}
            >
              Chat
              {unread > 0 && (
                <span className="absolute -top-2 -right-3 flex min-w-4 items-center justify-center rounded-full bg-[#d9444b] px-1 text-[0.65rem] leading-4 font-bold text-white no-underline">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel('log')}
            className="underline underline-offset-4"
          >
            Log
          </button>
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

      {panel === 'chat' && onChat && (
        <Modal title="Table chat" onClose={closePanel}>
          <ChatPanel messages={chat} mySeat={table.mySeat} onSend={onChat} />
        </Modal>
      )}
      {panel === 'log' && (
        <Modal title="Action log" onClose={() => setPanel(null)}>
          <ActionLog lines={log} />
        </Modal>
      )}
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

      {/* Phones held upright: everything in one column. Phones sideways: the table on the left,
          your seat and the controls on the right. */}
      <div className="landscape-phone:grid landscape-phone:grid-cols-[minmax(0,1.55fr)_minmax(15.5rem,1fr)] landscape-phone:items-start landscape-phone:gap-4 flex w-full flex-col items-center gap-2 sm:gap-3">
        {/* The table: everyone else around the oval, board and pot in the middle. A squarer
          shape on phones, so your cards and the controls still fit on the screen. */}
        <div className="landscape-phone:mx-auto landscape-phone:mt-5 landscape-phone:aspect-[8/5] landscape-phone:w-[min(100%,calc((100svh-4.5rem)*1.6))] narrow-landscape:aspect-[4/3] narrow-landscape:w-[min(100%,calc((100svh-4.5rem)*1.333))] short:mt-3 short:aspect-[6/5] relative mt-5 aspect-square w-full max-w-2xl sm:mt-2 sm:aspect-[16/11]">
          <section className="felt landscape-phone:inset-x-[11%] landscape-phone:inset-y-[18%] narrow-landscape:inset-x-[12%] narrow-landscape:inset-y-[20%] landscape-phone:rounded-[50%] landscape-phone:gap-3 landscape-phone:pt-[7%] absolute inset-x-[4%] inset-y-[14%] flex flex-col items-center justify-center gap-2 rounded-[45%] sm:inset-x-[8%]">
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
                    to={betSpot(from, undefined, sideways)}
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

        <div className="landscape-phone:pt-1 flex w-full flex-col items-center gap-2 sm:gap-3">
          {/* Me: pulled up into the space under the oval (not when sideways, where it has its own column). */}
          <div className="landscape-phone:mt-0 relative -mt-8 sm:-mt-16">
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
              <p className="text-sm text-white/60">
                You’ll be dealt in from the next hand.
              </p>
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
            // The controls stick to the bottom of the screen, above the phone's home bar, so you
            // never have to scroll to act.
            <div className="landscape-phone:static sticky bottom-0 z-30 flex w-full max-w-md flex-col gap-1.5 pb-[env(safe-area-inset-bottom)]">
              {turn && acting && (
                <TurnTimer
                  key={turn.deadline}
                  turn={turn}
                  label={
                    acting.seat === table.mySeat ? 'Your turn' : `${acting.name}’s turn`
                  }
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
                <p className="text-center text-white/60">
                  {me.dealtIn
                    ? 'You folded. Waiting for the hand to finish…'
                    : 'You’re dealt in from the next hand.'}
                </p>
              )}
            </div>
          )}

          {onReact && <ReactionPicker onReact={onReact} />}

          {error && (
            <p role="alert" className="text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
