import type { Action } from '@shared/engine'
import type { BettingOptions } from '@/lib/betting'
import { useUiStore } from '@/store/ui'

interface ActionBarProps {
  options: BettingOptions
  /** Only the player whose turn it is can act. */
  disabled: boolean
  /** The bar never changes the game itself. It just reports what the player chose. */
  onAction: (action: Action) => void
}

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max)

export function ActionBar({ options, disabled, onAction }: ActionBarProps) {
  const { toCall, canCheck, minRaiseTo, maxRaiseTo, halfPotRaiseTo, potRaiseTo } = options

  // The raise amount is UI-only state (Zustand). It is clamped on every render, so it
  // can never sit outside what is legal even if the table changes underneath it.
  const pendingBet = useUiStore((s) => s.pendingBet)
  const setPendingBet = useUiStore((s) => s.setPendingBet)
  const raiseTo = clamp(pendingBet || minRaiseTo, minRaiseTo, maxRaiseTo)

  const quickBets = [
    { label: '½ pot', value: halfPotRaiseTo },
    { label: 'Pot', value: potRaiseTo },
    { label: 'All-in', value: maxRaiseTo },
  ]

  return (
    <div
      className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-black/40 p-4"
      aria-label="Your actions"
    >
      {/* Raise slider and quick-bet buttons */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Raise to</span>
          <span className="text-lg font-bold">{raiseTo.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={minRaiseTo}
          max={maxRaiseTo}
          step={1}
          value={raiseTo}
          disabled={disabled || minRaiseTo >= maxRaiseTo}
          onChange={(e) => setPendingBet(Number(e.target.value))}
          className="accent-chip-gold w-full"
          aria-label="Raise amount"
        />
        <div className="flex gap-2">
          {quickBets.map(({ label, value }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => setPendingBet(value)}
              className="flex-1 rounded-lg bg-white/10 py-1.5 text-sm font-semibold hover:bg-white/20 disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* The three actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction({ type: 'fold' })}
          className="rounded-lg bg-red-700 py-3 font-semibold hover:bg-red-600 disabled:opacity-40"
        >
          Fold
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAction(canCheck ? { type: 'check' } : { type: 'call' })}
          className="rounded-lg bg-sky-700 py-3 font-semibold hover:bg-sky-600 disabled:opacity-40"
        >
          {canCheck ? 'Check' : `Call ${toCall.toLocaleString()}`}
        </button>
        <button
          type="button"
          disabled={disabled || maxRaiseTo <= toCall}
          onClick={() => onAction({ type: 'raise', amount: raiseTo })}
          className="bg-chip-gold rounded-lg py-3 font-semibold text-black hover:brightness-110 disabled:opacity-40"
        >
          Raise
        </button>
      </div>
    </div>
  )
}
