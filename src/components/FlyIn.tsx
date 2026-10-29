import { useAnimate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, type ReactNode } from 'react'

interface FlyInProps {
  /** Seconds to wait before leaving the deck. */
  delay: number
  children: ReactNode
  className?: string
}

/**
 * Makes whatever it wraps fly in from the deck (the element marked `data-deck`) to where it
 * actually sits. It measures both positions, so it works for any seat or board slot.
 * The card is invisible until its turn comes, so it can't flash in its final spot first.
 */
export function FlyIn({ delay, children, className }: FlyInProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const element = scope.current
    if (!element) return
    const deck = document.querySelector('[data-deck]')
    if (!deck || reduceMotion) {
      element.style.opacity = '1'
      return
    }

    const from = deck.getBoundingClientRect()
    const to = element.getBoundingClientRect()
    const x = from.left + from.width / 2 - (to.left + to.width / 2)
    const y = from.top + from.height / 2 - (to.top + to.height / 2)

    const controls = animate(
      element,
      { x: [x, 0], y: [y, 0], scale: [0.5, 1], opacity: [1, 1] },
      { duration: 0.45, delay, ease: 'easeOut' },
    )
    return () => controls.stop()
  }, [animate, delay, reduceMotion, scope])

  return (
    <div ref={scope} className={className} style={{ opacity: 0 }}>
      {children}
    </div>
  )
}
