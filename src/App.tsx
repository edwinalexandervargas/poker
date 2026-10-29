import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import Home from '@/pages/Home'

// The table page pulls in Firestore listeners, Motion and every table component.
// Loading it lazily keeps the first visit (the lobby) small.
const Room = lazy(() => import('@/pages/Room'))

export default function App() {
  return (
    <BrowserRouter>
      <UpdatePrompt />
      <Suspense
        fallback={<p className="p-8 text-center text-white/70">Loading table…</p>}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<Room />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
