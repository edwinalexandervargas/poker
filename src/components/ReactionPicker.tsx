import { REACTIONS } from '@shared/engine/reactions'

interface ReactionPickerProps {
  onReact: (emoji: string) => void
  disabled?: boolean
}

/** A row of emoji buttons. The server only accepts these, at most one every 1.5 seconds. */
export function ReactionPicker({ onReact, disabled = false }: ReactionPickerProps) {
  return (
    <div className="flex gap-1" role="group" aria-label="Send a reaction">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          disabled={disabled}
          className="glass-dark rounded-full px-2.5 py-1 text-lg transition hover:bg-white/10 active:scale-90 disabled:opacity-40"
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}
