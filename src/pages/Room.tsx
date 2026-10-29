import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { Action, RoomDoc, Seat } from '@shared/engine'
import { canRebuy } from '@shared/engine/room'
import { MAX_SEATS } from '@shared/engine/types'
import { JoinPrompt } from '@/components/JoinPrompt'
import { ConnectionBanner } from '@/components/ConnectionBanner'
import { Table } from '@/components/Table'
import { WaitingRoom } from '@/components/WaitingRoom'
import { dealNextHand, errorMessage, playAction, rebuy, startGame } from '@/lib/api'
import { isAway } from '@/lib/presence'
import { tableFromHand } from '@/lib/tableFromHand'
import { useHand } from '@/lib/useHand'
import { useNow, usePresence } from '@/lib/usePresence'
import { useTimeoutClaim } from '@/lib/useTimeoutClaim'
import { useRoom, type SeatedPlayer } from '@/lib/useRoom'

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-lg">{children}</p>
      <Link to="/" className="underline underline-offset-4">
        Back to lobby
      </Link>
    </main>
  )
}

export default function Room() {
  // The URL is /room/:code. Normalise it so "k7mq2" and "K7MQ2" are the same table.
  const code = useParams<{ code: string }>().code?.toUpperCase()
  if (!code) return <Message>No table code in the link.</Message>

  // key={code}: moving to a different table remounts, so no state carries over.
  return <RoomScreen key={code} code={code} />
}

function RoomScreen({ code }: { code: string }) {
  const view = useRoom(code)

  if (view.status === 'loading') return <Message>Loading table…</Message>
  if (view.status === 'missing') return <Message>No table with code {code}.</Message>
  if (view.status === 'error') return <Message>{view.message}</Message>

  const { room, players, myUid } = view
  const me = players.find((p) => p.uid === myUid)

  // Opened an invite link without being seated yet. While a game is on you can still sit
  // down: you're dealt in from the next hand.
  if (!me) {
    if (players.length >= MAX_SEATS) return <Message>That table is full.</Message>
    if (room.status === 'finished') return <Message>That game is over.</Message>
    return <JoinPrompt code={code} />
  }

  // Seated, but the game has not started: the lobby.
  if (room.status === 'waiting') {
    return <Lobby code={code} room={room} players={players} myUid={myUid} />
  }

  return <Game code={code} room={room} players={players} me={me} />
}

/** Runs a server request, freezing the buttons while it is in flight and reporting a refusal. */
function useServerCall() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(request: () => Promise<void>) {
    setPending(true)
    setError(null)
    try {
      await request()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return { pending, error, run }
}

interface LobbyProps {
  code: string
  room: RoomDoc
  players: SeatedPlayer[]
  myUid: string
}

function Lobby({ code, room, players, myUid }: LobbyProps) {
  const { pending, error, run } = useServerCall()
  return (
    <WaitingRoom
      code={code}
      players={players}
      isHost={room.hostUid === myUid}
      onStart={() => run(() => startGame(code))}
      starting={pending}
      error={error}
    />
  )
}

interface GameProps {
  code: string
  room: RoomDoc
  players: SeatedPlayer[]
  me: SeatedPlayer
}

function Game({ code, room, players, me }: GameProps) {
  const handView = useHand(code, me.uid)
  const { pending, error, run } = useServerCall()
  // Every player's screen watches the clock; whichever gets there first asks the server to act.
  const { online, clockOffset } = usePresence(code)
  const now = useNow(5000)
  useTimeoutClaim(code, handView.status === 'ready' ? handView.turn : null, online)

  if (handView.status === 'loading') return <Message>Dealing…</Message>
  if (handView.status === 'error') return <Message>{handView.message}</Message>
  if (handView.hand === null) return <Message>Waiting for the first hand…</Message>

  // Whose screens have stopped checking in.
  const awaySeats = new Set<Seat>(
    players
      .filter((p) => p.uid !== me.uid && isAway(p.lastSeen, now + clockOffset))
      .map((p) => p.seat),
  )
  const table = tableFromHand({
    hand: handView.hand,
    players,
    mySeat: me.seat,
    myCards: handView.myCards,
    bigBlind: room.config.bigBlind,
    awaySeats,
  })

  return (
    <>
      {!online && <ConnectionBanner />}
      <Table
        table={table}
        code={code}
        pending={pending}
        error={error}
        gameOver={room.status === 'finished'}
        turn={handView.turn}
        onAction={(action: Action) => run(() => playAction(code, action))}
        onNextHand={() => run(() => dealNextHand(code))}
        // My chips as the server last recorded them (updated when each hand ends).
        canRebuy={canRebuy(me.stack, room.status)}
        rebuyAmount={room.config.startingStack}
        onRebuy={() => run(() => rebuy(code))}
      />
    </>
  )
}
