import { Link, useParams } from 'react-router-dom'
import { Seat } from '@/components/Seat'
import { fakeTable } from '@/lib/fakeTable'

// Work in progress: only the seats are on the table so far.
export default function Room() {
  const { code } = useParams<{ code: string }>()

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-8 px-4">
      <p className="text-sm tracking-widest text-white/60 uppercase">Table {code}</p>
      <div className="flex gap-8">
        {fakeTable.seats.map((seat) => (
          <Seat key={seat.seat} seat={seat} />
        ))}
      </div>
      <Link to="/" className="underline underline-offset-4">
        Back to lobby
      </Link>
    </main>
  )
}
