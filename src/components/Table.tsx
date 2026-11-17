import { AnimatePresence, domAnimation, LazyMotion } from 'motion/react'
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
import { HandStrength } from '@/components/HandStrength'
import { Modal } from '@/components/Modal'
import { OpponentSeat } from '@/components/OpponentSeat'
import { PotDisplay } from '@/components/PotDisplay'
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
import { useInvite } from '@/lib/useInvite'
import {
  BackIcon,
  ChatIcon,
  CheckIcon,
  HistoryIcon,
  LinkIcon,
  LogIcon,
  TrophyIcon,
} from '@/components/Icons'

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
  chat = [],
  onChat,
}: TableProps) {
  // Bets are placed in code, so the sideways layout needs to be known here too.
  const sideways = useMediaQuery(SIDEWAYS_PHONE)
  const { share, copied } = useInvite(code)
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
  const iWon = table.result?.winners.includes(table.mySeat) ?? false
  const awayActing = acting && acting.seat !== table.mySeat && acting.away

  return (
    // LazyMotion with only the DOM animation features (no drag, no layout animations): the
    // cards and bets use `m.div`, which keeps the animation library much smaller. `strict`
    // makes a stray full `motion.div` an error, so the saving can't quietly come undone.
    <LazyMotion features={domAnimation} strict>
      <main className="table-main landscape-phone:max-w-5xl mx-auto flex min-h-svh max-w-3xl flex-col items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 sm:gap-3 sm:px-4 sm:py-4">
        {/* The bar is laid out 1.25rem tall (as the old text links were) and its buttons spill
          over into the spacing around it, so the table below gets the same room as before. */}
        <header className="table-nav flex h-5 w-full items-center justify-between gap-2 text-sm">
          <Link to="/" className="icon-btn -ml-2" aria-label="Leave the table">
            <BackIcon />
            <span className="hidden sm:inline">Leave</span>
          </Link>
          {/* The table code doubles as the invite: tap it to share or copy the link. */}
          <button
            type="button"
            onClick={share}
            className="chip gap-1.5 !py-1 text-sm font-bold tracking-[0.14em] hover:bg-white/10"
            aria-label={
              copied ? 'Invite link copied' : `Table ${code}. Copy the invite link`
            }
          >
            {code}
            <span className="text-muted">{copied ? <CheckIcon /> : <LinkIcon />}</span>
          </button>
          <nav
            className="panel flex items-center rounded-full p-0.5 !shadow-none"
            aria-label="Table panels"
          >
            {onChat && (
              <button
                type="button"
                onClick={openChat}
                className="icon-btn"
                aria-label={unread > 0 ? `Chat, ${unread} unread` : 'Chat'}
              >
                {/* The unread count sits on the icon, so it never covers the label. */}
                <span className="relative flex">
                  <ChatIcon />
                  {unread > 0 && (
                    <span className="bg-fold absolute -top-1.5 -right-2 flex min-w-4 items-center justify-center rounded-full px-1 text-[0.62rem] leading-4 font-bold text-white">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="hidden lg:inline">Chat</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanel('log')}
              className="icon-btn"
              aria-label="Action log"
            >
              <LogIcon />
              <span className="hidden lg:inline">Log</span>
            </button>
            <button
              type="button"
              onClick={() => setPanel('scores')}
              className="icon-btn"
              aria-label="Scores"
            >
              <TrophyIcon />
              <span className="hidden lg:inline">Scores</span>
            </button>
            <button
              type="button"
              onClick={() => setPanel('history')}
              className="icon-btn"
              aria-label="Hand history"
            >
              <HistoryIcon />
              <span className="hidden lg:inline">History</span>
            </button>
          </nav>
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
            <p className="text-muted mt-3 text-xs">
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
        <div className="table-grid landscape-phone:grid landscape-phone:grid-cols-[minmax(0,1.55fr)_minmax(15.5rem,1fr)] landscape-phone:items-start landscape-phone:gap-4 flex w-full flex-1 flex-col items-center gap-2 sm:gap-3">
          {/* The table: everyone else around the oval, board and pot in the middle. A squarer
          shape on phones, so your cards and the controls still fit on the screen. */}
          {/* Spacers either side of the table: it sits centred in the room above your seat, and your seat and the bet controls sit at the bottom of the window. */}
          <div aria-hidden className="landscape-phone:hidden flex-1" />
          <div className="landscape-phone:mx-auto landscape-phone:mt-5 landscape-phone:aspect-[8/5] landscape-phone:w-[min(100%,calc((100svh-4.5rem)*1.6))] narrow-landscape:aspect-[4/3] narrow-landscape:w-[min(100%,calc((100svh-4.5rem)*1.333))] short:mt-3 short:aspect-[5/4] tiny:mt-2 tiny:!aspect-[16/10] tiny:!w-[min(100%,calc((100svh-26rem)*1.6))] sm:tiny:!w-[min(100%,calc((100svh-27.5rem)*1.6))] @container relative mt-5 aspect-square w-full max-w-2xl min-[500px]:w-[clamp(17rem,calc((100svh-32.5rem)*1.25),100%)] sm:mt-2 sm:aspect-[16/11] sm:w-[min(100%,calc((100svh-38.5rem)*16/11))]">
            <section className="felt landscape-phone:inset-x-[11%] landscape-phone:inset-y-[18%] narrow-landscape:inset-x-[12%] narrow-landscape:inset-y-[20%] landscape-phone:rounded-[50%] landscape-phone:gap-3 absolute inset-x-[4%] inset-y-[14%] flex flex-col items-center justify-center gap-2 rounded-[45%] sm:inset-x-[8%]">
              {/* The deck is only where dealt cards fly from: kept in place but not shown, so
              the middle of the table holds just the board and the pot. */}
              <div
                aria-hidden
                className="pointer-events-none absolute top-[30%] left-1/2 opacity-0"
              >
                <Deck key={`deck-${table.handNumber}`} shuffle={dealPlan !== null} />
              </div>
              {/* The board sits dead centre; the pot hangs just under it without moving it. */}
              <div className="relative">
                <CommunityCards
                  key={`board-${table.handNumber}`}
                  cards={table.community}
                />
                <div className="absolute top-full left-1/2 mt-[clamp(0.25rem,1.5cqw,0.75rem)] -translate-x-1/2">
                  <PotDisplay pot={table.pot} />
                </div>
              </div>
            </section>

            {/* Bets on the felt, between each seat and the pot. Keyed by street, so when a
            betting round ends they all sweep into the pot together. */}
            <AnimatePresence>
              {table.seats
                .filter((seat) => seat.bet > 0)
                .map((seat) => {
                  const from =
                    seat.seat === table.mySeat ? MY_SPOT : spots.get(seat.seat)!
                  return (
                    <BetChips
                      key={`${table.handNumber}-${table.phase}-${seat.seat}`}
                      amount={seat.bet}
                      seat={seat.seat}
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
                  // Seats shrink a step at a time as the table gets smaller, so they keep clear
                  // of the board.
                  className="absolute -translate-x-1/2 -translate-y-1/2 @max-[560px]:scale-[0.88] @max-[460px]:scale-[0.78] @max-[360px]:scale-[0.68]"
                  style={{ left: `${spot.left}%`, top: `${spot.top}%` }}
                >
                  <OpponentSeat
                    seat={seat}
                    turn={turn}
                    won={handOver ? (table.result?.payouts[seat.seat] ?? 0) : 0}
                    handNumber={table.handNumber}
                    dealDelays={dealPlan?.delays[seat.seat]}
                  />
                </div>
              )
            })}
          </div>

          <div aria-hidden className="landscape-phone:hidden flex-1" />
          <div className="landscape-phone:pt-0 landscape-phone:gap-1.5 flex w-full flex-col items-center gap-2 sm:gap-3">
            {/* Me: pulled up into the space under the oval (not when sideways, where it has its own column). */}
            <div className="landscape-phone:mt-0 tiny:!mt-1 relative -mt-8 sm:-mt-4">
              <Seat
                seat={me}
                turn={turn}
                won={handOver ? (table.result?.payouts[me.seat] ?? 0) : 0}
                handNumber={table.handNumber}
                dealDelays={dealPlan?.delays[me.seat]}
              />
            </div>

            {/* What I have (and my rough chance of winning, if the table shows it). */}
            {table.myHand && me.inHand && !handOver && (
              <HandStrength name={table.myHand.name} nut={table.myHand.nut} />
            )}

            {awayActing && (
              <p role="status" className="chip !bg-amber-400/10 text-sm !text-amber-200">
                <span className="size-1.5 rounded-full bg-amber-400" aria-hidden />
                {acting.name} seems to be away. The clock keeps running.
              </p>
            )}

            {canRebuy && (
              <div className="panel flex w-full max-w-md flex-col items-center gap-2 rounded-[1.6rem] p-4 text-center">
                <p className="font-semibold">You’re out of chips</p>
                <button
                  type="button"
                  onClick={onRebuy}
                  disabled={pending}
                  className="btn btn-gold"
                >
                  {pending ? 'Buying in…' : `Rebuy for ${rebuyAmount.toLocaleString()}`}
                </button>
                <p className="text-muted text-sm">
                  You’ll be dealt in from the next hand.
                </p>
              </div>
            )}

            {handOver ? (
              <div className="panel flex w-full max-w-md flex-col items-center gap-3 rounded-[1.6rem] p-4 text-center">
                {resultText && (
                  <p
                    role="status"
                    className={`text-lg font-semibold text-balance ${iWon ? 'text-brass' : ''}`}
                  >
                    {resultText}
                  </p>
                )}
                {gameOver ? (
                  <>
                    <p className="font-num text-2xl">
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
                      className="btn btn-gold w-full max-w-60"
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
                  <p className="panel text-muted rounded-2xl px-4 py-3 text-center text-sm !shadow-none">
                    {me.dealtIn
                      ? 'You folded. Waiting for the hand to finish…'
                      : 'You’re dealt in from the next hand.'}
                  </p>
                )}
              </div>
            )}

            {error && (
              <p role="alert" className="text-fold text-sm">
                {error}
              </p>
            )}
          </div>
        </div>
      </main>
    </LazyMotion>
  )
}
