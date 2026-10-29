import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { REACTION_SHOW_MS } from '@shared/engine/reactions'

interface ReactionBubbleProps {
  reaction?: { emoji: string; at: number }
}

/**
 * Pops an emoji up over a seat for a few seconds when that player reacts. A reaction that is
 * already old when the screen opens (someone reloading) isn't shown again.
 */
export function ReactionBubble({ reaction }: ReactionBubbleProps) {
  // A reaction that was already old when this screen opened is never shown.
  const [staleAt] = useState(() =>
    reaction && Date.now() - reaction.at > REACTION_SHOW_MS ? reaction.at : null,
  )
  // The reaction whose time is up. Set by a timer, so it's an update from an outside event.
  const [expiredAt, setExpiredAt] = useState<number | null>(null)

  useEffect(() => {
    if (!reaction) return
    const left = REACTION_SHOW_MS - Math.max(0, Date.now() - reaction.at)
    const timer = setTimeout(() => setExpiredAt(reaction.at), Math.max(0, left))
    return () => clearTimeout(timer)
  }, [reaction])

  const visible =
    reaction && reaction.at !== staleAt && reaction.at !== expiredAt ? reaction : null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={visible.at}
          className="pointer-events-none absolute -top-6 left-1/2 z-20 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-2xl shadow-lg"
          initial={{ opacity: 0, y: 8, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 18 }}
          aria-live="polite"
        >
          {visible.emoji}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
