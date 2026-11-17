import { useEffect, useRef, useState } from 'react'

/**
 * Shares the table's invite link: the phone's share sheet where there is one, otherwise a
 * copy to the clipboard. `copied` is true for two seconds after a copy, for a "Copied" label.
 */
export function useInvite(code: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  async function share() {
    const url = `${window.location.origin}/room/${code}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'Join my poker table', url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // The person closed the share sheet, or the browser blocked copying. Nothing to do.
    }
  }
  return { share, copied }
}
