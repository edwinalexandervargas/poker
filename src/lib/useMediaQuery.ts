import { useSyncExternalStore } from 'react'

/**
 * True while a CSS media query matches, updating when it changes (turning the phone, resizing
 * the window). For the few things CSS can't do on its own, like positions computed in code.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** The same rule as the `landscape-phone` variant in index.css. */
export const SIDEWAYS_PHONE =
  '(orientation: landscape) and (max-height: 520px), (orientation: landscape) and (min-width: 900px) and (max-height: 1200px)'
