import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useUpdateCheck } from '@/lib/useUpdateCheck'

/**
 * Brings an open app up to date after a deploy. In the lobby it just reloads (nothing to lose).
 * At a table it asks first, so nobody's screen reloads in the middle of a hand: the seat and
 * cards come back after a refresh, but it's still jarring mid-decision.
 */
export function UpdatePrompt() {
  const available = useUpdateCheck()
  const atTable = useLocation().pathname.startsWith('/room/')

  useEffect(() => {
    if (available && !atTable) window.location.reload()
  }, [available, atTable])

  if (!available || !atTable) return null

  return (
    <div className="fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="glass flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
      >
        <span className="size-2 rounded-full bg-[#e3be62]" aria-hidden />
        New version available · <span className="text-[#e3be62]">Refresh</span>
      </button>
    </div>
  )
}
