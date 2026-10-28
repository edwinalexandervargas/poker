import { Link, useParams } from 'react-router-dom'
import type { Action } from '@shared/engine'
import { JoinPrompt } from '@/components/JoinPrompt'
import { Table } from '@/components/Table'
import { WaitingRoom } from '@/components/WaitingRoom'
import { fakeTable, type TableState } from '@/lib/fakeTable'
import { useRoom } from '@/lib/useRoom'

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

  const { players, myUid } = view
  const me = players.find((p) => p.uid === myUid)

  // Opened an invite link without being seated yet.
  if (!me) {
    if (players.length >= 2) return <Message>That table is full.</Message>
    return <JoinPrompt code={code} />
  }

  if (players.length < 2) return <WaitingRoom code={code} players={players} />

  // Both seated. The real hand engine comes next; until then, show the demo hand
  // with the real names so you can see two browsers sitting at one table.
  const opponent = players.find((p) => p.uid !== myUid)
  const demoTable: TableState = {
    ...fakeTable,
    seats: [
      { ...fakeTable.seats[0], name: me.name },
      { ...fakeTable.seats[1], name: opponent?.name ?? 'Opponent' },
    ],
  }

  function handleAction(action: Action) {
    // Later this calls the submitAction Cloud Function. For now it just logs.
    console.log('Action chosen:', action)
  }

  return <Table table={demoTable} code={code} onAction={handleAction} />
}
