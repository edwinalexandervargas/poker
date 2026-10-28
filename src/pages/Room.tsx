import { Link, useParams } from 'react-router-dom'

// Placeholder table. Seats, community cards, pot and the action bar land here next.
export default function Room() {
  const { code } = useParams<{ code: string }>()

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm tracking-widest text-white/60 uppercase">Table</p>
      <h1 className="text-5xl font-bold tracking-widest">{code}</h1>
      <p className="text-white/70">The table UI goes here.</p>
      <Link to="/" className="underline underline-offset-4">
        Back to lobby
      </Link>
    </main>
  )
}
