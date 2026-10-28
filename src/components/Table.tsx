import { Link } from 'react-router-dom'
import type { Action } from '@shared/engine'
import { ActionBar } from '@/components/ActionBar'
import { CommunityCards } from '@/components/CommunityCards'
import { PotDisplay } from '@/components/PotDisplay'
import { Seat } from '@/components/Seat'
import { getBettingOptions } from '@/lib/betting'
import type { TableState } from '@/lib/fakeTable'

interface TableProps {
  table: TableState
  code: string
  onAction: (action: Action) => void
}

/** The whole table screen. It draws whatever TableState it is given. */
export function Table({ table, code, onAction }: TableProps) {
  const me = table.seats[table.mySeat]
  const opponent = table.seats[table.mySeat === 0 ? 1 : 0]

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
      <Seat seat={opponent} />

      <section className="border-rail bg-felt-700 flex flex-col items-center gap-3 rounded-[2rem] border-4 px-4 py-6 shadow-inner sm:px-8">
        <PotDisplay pot={table.pot} />
        <CommunityCards cards={table.community} />
      </section>

      <Seat seat={me} />

      <ActionBar
        options={getBettingOptions(table)}
        disabled={!me.isToAct}
        onAction={onAction}
      />
    </main>
  )
}
