import { useEffect, type ReactNode } from 'react'
import { CloseIcon } from '@/components/Icons'

interface ModalProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/**
 * A dialog over the table: a sheet rising from the bottom on a phone, a centred panel on a
 * bigger screen. Closes on the X, the backdrop, or Escape.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#05080c]/70 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="sheet-in bg-surface flex max-h-[85svh] w-full max-w-md flex-col rounded-t-[1.75rem] border border-white/[0.07] pb-[env(safe-area-inset-bottom)] shadow-[0_30px_80px_rgb(0_0_0/0.7)] sm:rounded-[1.75rem] sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* The grab handle: just a cue that this is a sheet on a phone. */}
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/15 sm:hidden"
          aria-hidden
        />
        <header className="flex items-center justify-between px-5 pt-3 pb-2 sm:pt-4">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="icon-btn -mr-2 bg-white/5"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pt-1 pb-5">{children}</div>
      </div>
    </div>
  )
}
