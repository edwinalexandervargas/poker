import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import Home from '@/pages/Home'

// The table page pulls in Firestore listeners, Motion and every table component.
// Loading it lazily keeps the first visit (the lobby) small.
const Room = lazy(() => import('@/pages/Room'))

// Made-up tables for checking the design, only in `npm run dev`. In the deployed build this is
// null, so the page and its fake data are left out entirely.
const Preview = import.meta.env.DEV ? lazy(() => import('@/pages/Preview')) : null

export default function App() {
  return (
    <BrowserRouter>
      <UpdatePrompt />
      <Suspense fallback={<p className="text-muted p-8 text-center">Loading table…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/room/:code" element={<Room />} />
          {Preview && <Route path="/preview" element={<Preview />} />}
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
